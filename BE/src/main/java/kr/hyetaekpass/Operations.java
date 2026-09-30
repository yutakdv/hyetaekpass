package kr.hyetaekpass;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.scheduling.annotation.Scheduled;

@Service
class Operations {
    final JdbcTemplate db;final TransactionTemplate tx;final CatalogChecks checks;final LocalJournal journal;
    volatile boolean ready=false;
    final SecureRandom random=new SecureRandom();
    final byte[] rateSalt=new byte[32];
    final Map<String,long[]> rate=new HashMap<>();
    Operations(JdbcTemplate db,PlatformTransactionManager transactions,CatalogChecks checks,LocalJournal journal) { this.db=db;tx=new TransactionTemplate(transactions);this.checks=checks;this.journal=journal;random.nextBytes(rateSalt); }
    @EventListener(ApplicationReadyEvent.class)
    void startup() {
        try {
            byte[] empty=getClass().getResourceAsStream("/empty-catalog.json").readAllBytes();
            tx.execute(s->{lock();db.update("INSERT INTO catalog_release(release_id,body,digest,size_bytes) VALUES ('empty-v1',?,?,?) ON CONFLICT DO NOTHING",empty,CatalogChecks.hash(empty),empty.length);
                if(db.queryForObject("SELECT count(*) FROM release_activation",Integer.class)==0)activate("empty-v1","system");return null;});
            replay("system");
        } catch(Exception e) { ready=false; }
    }
    void lock() { db.execute("SELECT pg_advisory_xact_lock(72809423)"); }
    void audit(String actor,String action,String target) { db.update("INSERT INTO audit_event(actor,action,target) VALUES (?,?,?)",actor,action,target); }
    String active() { return db.queryForObject("SELECT release_id FROM release_activation ORDER BY id DESC LIMIT 1",String.class); }
    void activate(String id,String actor) { db.update("INSERT INTO release_activation(release_id,actor) VALUES (?,?)",id,actor);audit(actor,"ACTIVATE",id); }
    // ponytail: full O(events) verification for a small pilot journal; use verified head/cursor checks before scaling traffic.
    synchronized void ensureReady() { ApiError.require(ready,503,"SAFETY_UNAVAILABLE");try { verify(journal.read()); }catch(Exception e){ready=false;throw new ApiError(503,"SAFETY_UNAVAILABLE");} }
    void health() { ApiError.require(db.queryForObject("SELECT 1",Integer.class)==1,503,"SAFETY_UNAVAILABLE");journal.read(); }
    void verify(List<JsonNode> events) {
        var applied=db.queryForList("SELECT sequence,digest FROM journal_applied ORDER BY sequence");
        ApiError.require(applied.size()==events.size(),503,"SAFETY_UNAVAILABLE");
        for(int i=0;i<events.size();i++) ApiError.require(((Number)applied.get(i).get("sequence")).longValue()==events.get(i).path("sequence").asLong()&&applied.get(i).get("digest").equals(CatalogChecks.hash(checks.bytes(events.get(i)))),503,"SAFETY_UNAVAILABLE");
        JsonNode safety=checks.parse(db.queryForObject("SELECT body::text FROM safety_state WHERE id=1",String.class).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        long revision=db.queryForObject("SELECT revision FROM safety_state WHERE id=1",Long.class);
        for(JsonNode event:events) {
            if(event.path("type").asText().equals("REPORT_DELETE")) ApiError.require(db.queryForObject("SELECT count(*) FROM error_report WHERE id=?::uuid",Integer.class,event.path("target").asText())==0,503,"SAFETY_UNAVAILABLE");
            else {
                ApiError.require(revision>=event.path("sequence").asLong(),503,"SAFETY_UNAVAILABLE");
                for(String field:List.of("blockedRuleIds","blockedSourceIds"))for(JsonNode value:event.path("payload").path(field)) {boolean found=false;for(JsonNode existing:safety.path(field))if(existing.equals(value))found=true;ApiError.require(found,503,"SAFETY_UNAVAILABLE");}
                event.path("payload").path("flags").properties().forEach(e->ApiError.require(!safety.path("flags").path(e.getKey()).asBoolean(),503,"SAFETY_UNAVAILABLE"));
            }
        }
    }
    synchronized Map<String,Object> replay(String actor) {
        ready=false;List<JsonNode> events=journal.read();
        for(JsonNode event:events)apply(event);
        verify(events);audit(actor,"RECOVERY_REPLAY","journal");ready=true;
        return Map.of("ready",true,"events",events.size());
    }
    void apply(JsonNode event) {
        tx.execute(s->{lock();
            String id=event.path("eventId").asText();String digest=CatalogChecks.hash(checks.bytes(event));
            var existing=db.queryForList("SELECT digest FROM journal_applied WHERE event_id=?::uuid",id);
            if(!existing.isEmpty()){ApiError.require(existing.getFirst().get("digest").equals(digest),503,"SAFETY_UNAVAILABLE");return null;}
            switch(event.path("type").asText()) {
                case "REPORT_DELETE"->db.update("DELETE FROM error_report WHERE id=?::uuid",event.path("target").asText());
                case "SUSPEND"->{
                    ObjectNode state=(ObjectNode)checks.parse(db.queryForObject("SELECT body::text FROM safety_state WHERE id=1 FOR UPDATE",String.class).getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    JsonNode payload=event.path("payload");
                    for(String group:List.of("blockedRuleIds","blockedSourceIds")) {
                        Set<String> values=new TreeSet<>();for(JsonNode v:state.path(group))values.add(v.asText());for(JsonNode v:payload.path(group))values.add(v.asText());state.set(group,checks.json.valueToTree(values));
                    }
                    payload.path("flags").properties().forEach(e->((ObjectNode)state.path("flags")).put(e.getKey(),false));
                    db.update("UPDATE safety_state SET revision=GREATEST(revision,?),body=?::jsonb WHERE id=1",event.path("sequence").asLong(),checks.string(state));
                }
                default->throw new ApiError(503,"JOURNAL_UNAVAILABLE");
            }
            db.update("INSERT INTO journal_applied(event_id,sequence,digest) VALUES (?::uuid,?,?)",id,event.path("sequence").asLong(),digest);
            audit(event.path("actor").asText(),event.path("type").asText(),event.path("target").asText());return null;});
    }
    Map<String,Object> safety() {
        Map<String,Object> row=db.queryForMap("SELECT revision,body::text FROM safety_state WHERE id=1");
        var state=checks.map(checks.parse(((String)row.get("body")).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        state.put("revision",row.get("revision"));state.put("serverTime",Instant.now().toString());return state;
    }
    Map<String,Object> bootstrap() {
        ensureReady();var release=db.queryForMap("SELECT release_id,digest,size_bytes FROM catalog_release WHERE release_id=?",active());
        return Map.of("schemaVersion",1,"semanticsVersion",1,"releaseId",release.get("release_id"),"catalogPath","/v1/catalog/"+release.get("release_id"),"sha256",release.get("digest"),"sizeBytes",release.get("size_bytes"),"safety",safety());
    }
    byte[] catalog(String id) { ensureReady();ApiError.require(id.matches("[A-Za-z0-9._-]{1,200}"),400,"INPUT_INVALID");var rows=db.queryForList("SELECT body FROM catalog_release WHERE release_id=?",id);ApiError.require(!rows.isEmpty(),404,"NOT_FOUND");return (byte[])rows.getFirst().get("body"); }
    Map<String,Object> draft(String id) { UUID.fromString(id);var rows=db.queryForList("SELECT *,review::text AS review_text FROM catalog_draft WHERE id=?::uuid",id);ApiError.require(!rows.isEmpty(),404,"NOT_FOUND");return rows.getFirst(); }
    JsonNode neutral(byte[] body) {
        JsonNode c=checks.catalog(body);
        for(JsonNode r:c.path("rules")) {((ObjectNode)r).remove("review");((ObjectNode)r).put("status",r.has("calculation")?"DRAFT":"GUIDE_ONLY");}
        for(JsonNode combo:c.path("combinations"))((ObjectNode)combo).remove("review");return c;
    }
    Map<String,Object> importCatalog(byte[] body,String author) {
        ensureReady();JsonNode c=neutral(body);byte[] bytes=checks.bytes(c);String id=UUID.randomUUID().toString();
        tx.execute(s->{lock();ApiError.require(db.queryForObject("SELECT count(*) FROM catalog_draft WHERE release_id=?",Integer.class,c.path("releaseId").asText())==0,409,"CONFLICT");
            db.update("INSERT INTO catalog_draft(id,release_id,author,body,digest,status) VALUES (?::uuid,?,?,?,?, 'DRAFT')",id,c.path("releaseId").asText(),author,bytes,CatalogChecks.hash(bytes));audit(author,"IMPORT",id);return null;});return Map.of("id",id,"status","DRAFT");
    }
    Map<String,Object> edit(String id,byte[] body,String author) {
        ensureReady();JsonNode c=neutral(body);byte[] bytes=checks.bytes(c);
        return tx.execute(s->{lock();var row=draft(id);ApiError.require(!row.get("status").equals("PUBLISHED"),409,"CONFLICT");ApiError.require(row.get("author").equals(author)&&row.get("release_id").equals(c.path("releaseId").asText()),403,"FORBIDDEN");
            db.update("UPDATE catalog_draft SET body=?,digest=?,status='DRAFT',review=NULL,reviewed_digest=NULL WHERE id=?::uuid",bytes,CatalogChecks.hash(bytes),id);audit(author,"EDIT",id);return Map.of("id",id,"status","DRAFT");});
    }
    Map<String,Object> review(String id,JsonNode input,String reviewer) {
        ensureReady();fields(input,Set.of("reviewer","evidenceRef","goldenTests","method"));
        ApiError.require(input.path("reviewer").asText().equals(reviewer)&&input.path("method").asText().equals("HUMAN_ORIGINAL"),403,"REVIEW_REQUIRED");
        text(input,"evidenceRef",160);ApiError.require(input.path("goldenTests").isArray()&&!input.path("goldenTests").isEmpty()&&input.path("goldenTests").size()<=100,400,"INPUT_INVALID");for(JsonNode golden:input.path("goldenTests"))ApiError.require(golden.isTextual()&&!golden.asText().isBlank()&&golden.asText().length()<=200,400,"INPUT_INVALID");
        return tx.execute(s->{lock();var row=draft(id);ApiError.require(!row.get("status").equals("PUBLISHED"),409,"CONFLICT");ApiError.require(!row.get("author").equals(reviewer),403,"REVIEW_REQUIRED");
            JsonNode c=checks.catalog((byte[])row.get("body"));ObjectNode review=(ObjectNode)input.deepCopy();review.put("author",(String)row.get("author"));review.put("reviewedAt",Instant.now().toString());
            for(JsonNode r:c.path("rules")){((ObjectNode)r).put("status",r.has("calculation")?"CATALOG_REVIEWED":"GUIDE_ONLY");((ObjectNode)r).set("review",review);}
            for(JsonNode combo:c.path("combinations"))((ObjectNode)combo).set("review",review);
            checks.publishable(c,review,(String)row.get("author"));byte[] bytes=checks.bytes(c);String digest=CatalogChecks.hash(bytes);
            db.update("UPDATE catalog_draft SET body=?,digest=?,status='REVIEWED',review=?::jsonb,reviewed_digest=? WHERE id=?::uuid",bytes,digest,checks.string(review),digest,id);audit(reviewer,"HUMAN_REVIEW_RECORD",id);return Map.of("id",id,"status","REVIEWED");});
    }
    Map<String,Object> publish(String id,JsonNode input,String publisher) {
        ensureReady();fields(input,Set.of("expectedReleaseId"));String expected=text(input,"expectedReleaseId",200);
        return tx.execute(s->{lock();var row=draft(id);ApiError.require(active().equals(expected),409,"CONFLICT");ApiError.require(row.get("status").equals("REVIEWED")&&row.get("digest").equals(row.get("reviewed_digest")),403,"REVIEW_REQUIRED");ApiError.require(!row.get("author").equals(publisher),403,"FORBIDDEN");
            byte[] bytes=(byte[])row.get("body");JsonNode c=checks.catalog(bytes);JsonNode review=checks.parse(((String)row.get("review_text")).getBytes(java.nio.charset.StandardCharsets.UTF_8));checks.publishable(c,review,(String)row.get("author"));
            String release=(String)row.get("release_id");db.update("INSERT INTO catalog_release(release_id,body,digest,size_bytes) VALUES (?,?,?,?)",release,bytes,row.get("digest"),bytes.length);
            byte[] stored=db.queryForObject("SELECT body FROM catalog_release WHERE release_id=?",byte[].class,release);ApiError.require(Arrays.equals(bytes,stored)&&CatalogChecks.hash(stored).equals(row.get("digest")),503,"SAFETY_UNAVAILABLE");
            db.update("UPDATE catalog_draft SET status='PUBLISHED' WHERE id=?::uuid",id);audit(publisher,"PUBLISH",release);activate(release,publisher);return Map.of("releaseId",release);});
    }
    Map<String,Object> rollback(JsonNode input,String actor) {
        ensureReady();fields(input,Set.of("releaseId","expectedReleaseId"));String target=text(input,"releaseId",200),expected=text(input,"expectedReleaseId",200);
        return tx.execute(s->{lock();ApiError.require(active().equals(expected),409,"CONFLICT");var stored=db.queryForList("SELECT body FROM catalog_release WHERE release_id=?",target);ApiError.require(!stored.isEmpty(),404,"NOT_FOUND");byte[] raw=(byte[])stored.getFirst().get("body");JsonNode c=checks.catalog(raw);
            if(!c.path("rules").isEmpty()||!c.path("sources").isEmpty()||!c.path("places").isEmpty()) {
                var rows=db.queryForList("SELECT author,review::text AS review FROM catalog_draft WHERE release_id=? AND status='PUBLISHED'",target);ApiError.require(!rows.isEmpty(),403,"REVIEW_REQUIRED");var row=rows.getFirst();checks.publishable(c,checks.parse(((String)row.get("review")).getBytes(java.nio.charset.StandardCharsets.UTF_8)),(String)row.get("author"));
            }
            activate(target,actor);audit(actor,"ROLLBACK",target);return Map.of("releaseId",target);});
    }
    List<Map<String,Object>> catalogs() {
        ensureReady();var result=new ArrayList<Map<String,Object>>();
        for(var row:db.queryForList("SELECT id::text,release_id,author,status,body,review::text,created_at::text FROM catalog_draft ORDER BY created_at DESC LIMIT 200")) {
            var item=new LinkedHashMap<String,Object>();item.put("id",row.get("id"));item.put("releaseId",row.get("release_id"));item.put("author",row.get("author"));item.put("status",row.get("status"));item.put("catalog",checks.map(checks.parse((byte[])row.get("body"))));item.put("review",row.get("review")==null?null:checks.map(checks.parse(((String)row.get("review")).getBytes(java.nio.charset.StandardCharsets.UTF_8))));item.put("createdAt",row.get("created_at"));result.add(item);
        }return result;
    }
    synchronized Map<String,Object> suspend(JsonNode input,String actor) {
        ensureReady();fields(input,Set.of("ruleIds","sourceIds","flags","reason"));text(input,"reason",500);
        var payload=new LinkedHashMap<String,Object>();
        for(String name:List.of("ruleIds","sourceIds")){JsonNode ids=input.path(name);ApiError.require(ids.isMissingNode()||ids.isArray()&&ids.size()<=1000,400,"INPUT_INVALID");var result=new TreeSet<String>();for(JsonNode id:ids)ApiError.require(id.isTextual()&&!id.asText().isBlank()&&id.asText().length()<=200&&result.add(id.asText()),400,"INPUT_INVALID");payload.put(name.equals("ruleIds")?"blockedRuleIds":"blockedSourceIds",result);}
        var flags=new LinkedHashMap<String,Object>();if(input.has("flags")){fields(input.get("flags"),Set.of("catalog","foregroundLocation","iosBackground","androidBackground","area"));input.get("flags").properties().forEach(e->{ApiError.require(e.getValue().isBoolean(),400,"INPUT_INVALID");ApiError.require(!e.getValue().asBoolean(),403,"FORBIDDEN");flags.put(e.getKey(),false);});}payload.put("flags",flags);
        ApiError.require(!flags.isEmpty()||!((Set<?>)payload.get("blockedRuleIds")).isEmpty()||!((Set<?>)payload.get("blockedSourceIds")).isEmpty(),400,"INPUT_INVALID");
        mutateJournal("SUSPEND","safety",payload,actor);return safety();
    }
    synchronized void mutateJournal(String type,String target,Map<String,Object> payload,String actor) {
        ready=false;JsonNode event=journal.append(type,target,payload,actor);apply(event);verify(journal.read());ready=true;
    }
    synchronized void rateLimit(String address) {
        byte[] addressBytes=address.getBytes(java.nio.charset.StandardCharsets.UTF_8);byte[] keyBytes=Arrays.copyOf(rateSalt,rateSalt.length+addressBytes.length);System.arraycopy(addressBytes,0,keyBytes,rateSalt.length,addressBytes.length);String key=CatalogChecks.hash(keyBytes);long now=System.currentTimeMillis();
        rate.values().removeIf(v->now-v[0]>=60000);ApiError.require(rate.size()<10000||rate.containsKey(key),429,"RATE_LIMITED");long[] window=rate.computeIfAbsent(key,k->new long[]{now,0});ApiError.require(++window[1]<=10,429,"RATE_LIMITED");
    }
    Map<String,Object> report(JsonNode input,String address) {
        ensureReady();fields(input,Set.of("ruleId","category","message"));String category=text(input,"category",80),message=text(input,"message",2000);String rule=input.has("ruleId")?text(input,"ruleId",200):null;rateLimit(address);
        String id=UUID.randomUUID().toString();byte[] tokenBytes=new byte[32];random.nextBytes(tokenBytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        db.update("INSERT INTO error_report(id,rule_id,category,message,token_hash,status) VALUES (?::uuid,?,?,?,?, 'OPEN')",id,rule,category,message,CatalogChecks.hash(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)));return Map.of("id",id,"deleteToken",token);
    }
    synchronized void deleteReport(String id,String token,String actor) {
        ensureReady();UUID.fromString(id);
        if(token!=null){ApiError.require(token.matches("[A-Za-z0-9_-]{43}"),403,"FORBIDDEN");var rows=db.queryForList("SELECT token_hash FROM error_report WHERE id=?::uuid",id);if(rows.isEmpty())return;
            ApiError.require(java.security.MessageDigest.isEqual(((String)rows.getFirst().get("token_hash")).getBytes(java.nio.charset.StandardCharsets.US_ASCII),CatalogChecks.hash(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)).getBytes(java.nio.charset.StandardCharsets.US_ASCII)),403,"FORBIDDEN");}
        mutateJournal("REPORT_DELETE",id,Map.of(),actor);
    }
    List<Map<String,Object>> reports(String actor) {ensureReady();audit(actor,"REPORT_INBOX_READ","inbox");return db.queryForList("SELECT id::text AS id,rule_id AS \"ruleId\",category,message,status,created_at::text AS \"createdAt\" FROM error_report ORDER BY created_at DESC LIMIT 200");}
    Map<String,Object> updateReport(String id,JsonNode input,String actor) {ensureReady();UUID.fromString(id);fields(input,Set.of("status","category"));String status=text(input,"status",20),category=text(input,"category",80);ApiError.require(Set.of("OPEN","CLASSIFIED","CLOSED").contains(status),400,"INPUT_INVALID");
        return tx.execute(s->{ApiError.require(db.update("UPDATE error_report SET status=?,category=?,closed_at=CASE WHEN ?='CLOSED' THEN now() ELSE NULL END WHERE id=?::uuid",status,category,status,id)==1,404,"NOT_FOUND");audit(actor,"REPORT_"+status,id);return Map.of("id",id,"status",status);});}
    List<Map<String,Object>> audits(String actor) {ensureReady();audit(actor,"AUDIT_READ","audit");return db.queryForList("SELECT id,actor,action,target,created_at::text AS \"createdAt\" FROM audit_event ORDER BY id DESC LIMIT 500");}
    @Scheduled(fixedDelayString="${RETENTION_INTERVAL_MS:3600000}")
    void retention() {try {ensureReady();for(var row:db.queryForList("SELECT id::text FROM error_report WHERE created_at<now()-interval '90 days' OR closed_at<now()-interval '30 days' LIMIT 100"))deleteReport((String)row.get("id"),null,"retention");}catch(Exception e){/* Failed retention is retried without logging report contents. */}}
    static void fields(JsonNode node,Set<String> allowed) {ApiError.require(node.isObject(),400,"INPUT_INVALID");node.fieldNames().forEachRemaining(k->ApiError.require(allowed.contains(k),400,"INPUT_INVALID"));}
    static String text(JsonNode node,String key,int max) {JsonNode value=node.path(key);ApiError.require(value.isTextual()&&!value.asText().isBlank()&&value.asText().length()<=max,400,"INPUT_INVALID");return value.asText();}
}
