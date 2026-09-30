package kr.hyetaekpass;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.*;
import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;

@Component
class CatalogChecks {
    final ObjectMapper json = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    final JsonSchema schema;
    final Path evidence;
    final String evidenceBucket;
    final software.amazon.awssdk.services.s3.S3Client evidenceS3;
    final boolean fileEvidence;
    CatalogChecks(Environment env) throws IOException {
        var config = new SchemaValidatorsConfig(); config.setFormatAssertionsEnabled(true);
        schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7).getSchema(getClass().getResourceAsStream("/catalog.schema.json"),config);
        evidence = Path.of(env.getProperty("EVIDENCE_DIR","./.evidence")).toAbsolutePath();
        evidenceBucket=env.getProperty("EVIDENCE_BUCKET","");
        evidenceS3=evidenceBucket.isBlank()?null:PrivateS3.client(env,"EVIDENCE_ENDPOINT");
        fileEvidence=Arrays.asList(env.getActiveProfiles()).equals(List.of("local"))||env.getProperty("EVIDENCE_DIR")!=null;
    }
    JsonNode parse(byte[] bytes) {
        ApiError.require(bytes.length<=5*1024*1024,413,"TOO_LARGE");
        try { return json.readTree(bytes); } catch(IOException e) { throw new ApiError(400,"SCHEMA_INVALID"); }
    }
    byte[] bytes(Object value) { try { return json.writeValueAsBytes(value); } catch(IOException e) { throw new IllegalStateException(); } }
    String string(Object value) { return new String(bytes(value),java.nio.charset.StandardCharsets.UTF_8); }
    static String hash(byte[] bytes) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); } catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); } }
    Map<String,Object> map(JsonNode node) { return json.convertValue(node,Map.class); }
    JsonNode catalog(byte[] raw) {
        JsonNode c=parse(raw);
        ApiError.require(c!=null&&!c.isNull()&&schema.validate(c).isEmpty(),400,"SCHEMA_INVALID");
        ApiError.require(c.path("releaseId").asText().matches("[A-Za-z0-9][A-Za-z0-9._-]{0,199}"),400,"SCHEMA_INVALID");
        Map<String,Set<String>> ids = new HashMap<>();
        for(String field:List.of("brands","products","sources","places","rules","combinations")) {
            var set=new HashSet<String>();
            for(JsonNode item:c.path(field)) ApiError.require(set.add(item.path("id").asText()),400,"SCHEMA_INVALID");
            ids.put(field,set);
        }
        for(JsonNode p:c.path("places")) { ref(ids,"brands",p,"brandId"); ref(ids,"sources",p,"sourceId"); }
        for(JsonNode source:c.path("sources")) {
            ApiError.require(source.path("url").asText().startsWith("https://"),400,"SCHEMA_INVALID");
            ApiError.require(time(source,"checkedAt").isBefore(time(source,"freshUntil")),400,"SCHEMA_INVALID");
        }
        for(JsonNode r:c.path("rules")) {
            ref(ids,"products",r,"productId"); ref(ids,"brands",r,"brandId"); ref(ids,"sources",r,"sourceId");
            for(JsonNode p:r.path("placeIds")) ApiError.require(ids.get("places").contains(p.asText()),400,"SCHEMA_INVALID");
            ApiError.require(time(r,"startsAt").isBefore(time(r,"endsAt")),400,"SCHEMA_INVALID");
            ApiError.require(r.has("calculation")!=r.has("unsupportedReason"),400,"SCHEMA_INVALID");
            if(r.has("calculation")) {
                JsonNode calc=r.get("calculation");
                ApiError.require(!calc.path("kind").asText().equals("PERCENT")||calc.path("value").asInt()<=10000,400,"SCHEMA_INVALID");
                ApiError.require(!r.path("status").asText().equals("GUIDE_ONLY"),400,"SCHEMA_INVALID");
            }
        }
        for(JsonNode combo:c.path("combinations")) {
            for(JsonNode id:combo.path("ruleIds")) ApiError.require(ids.get("rules").contains(id.asText()),400,"SCHEMA_INVALID");
        }
        return c;
    }
    void ref(Map<String,Set<String>> ids,String group,JsonNode item,String field) { ApiError.require(ids.get(group).contains(item.path(field).asText()),400,"SCHEMA_INVALID"); }
    static Instant time(JsonNode node,String key) { try { return Instant.parse(node.path(key).asText()); } catch(Exception e) { throw new ApiError(400,"SCHEMA_INVALID"); } }
    JsonNode proof(String ref,String code) {
        ApiError.require(ref!=null&&ref.matches("[A-Za-z0-9_-]{1,160}"),403,code);
        try {
            if(evidenceS3!=null){PrivateS3.verify(evidenceS3,evidenceBucket);return parse(PrivateS3.read(evidenceS3,evidenceBucket,"evidence/"+ref+".json"));}
            ApiError.require(fileEvidence,403,code);
            var p=evidence.resolve(ref+".json"); ApiError.require(Files.isRegularFile(p)&&!Files.isSymbolicLink(p)&&Files.size(p)<=65536,403,code); return parse(Files.readAllBytes(p));
        } catch(Exception e) { throw new ApiError(403,code); }
    }
    void publishable(JsonNode c,JsonNode review,String author) {
        Instant now=Instant.now();
        for(JsonNode source:c.path("sources")) {
            var rights=source.path("rights");
            for(String right:List.of("display","transform","iosDistribution","androidDistribution","offlineCache","update","revoke")) ApiError.require(rights.path(right).asBoolean(),403,"RIGHTS_REQUIRED");
            ApiError.require(time(source,"rightsUntil").isAfter(now)&&time(source,"freshUntil").isAfter(now)&&!time(source,"checkedAt").isAfter(now),403,"RIGHTS_REQUIRED");
            JsonNode grant=proof(rights.path("evidenceRef").asText(),"RIGHTS_REQUIRED");
            ApiError.require(grant.path("kind").asText().equals("RIGHTS_GRANT")&&grant.path("sourceId").equals(source.path("id"))&&grant.path("documentVersion").equals(source.path("documentVersion"))&&grant.path("sourceDigest").asText().equals(hash(bytes(source))),403,"RIGHTS_REQUIRED");
            for(String right:List.of("display","transform","iosDistribution","androidDistribution","offlineCache","update","revoke")) ApiError.require(grant.path("rights").path(right).asBoolean(),403,"RIGHTS_REQUIRED");
        }
        for(JsonNode r:c.path("rules")) {
            ApiError.require(r.path("origin").asText().equals("CATALOG"),403,"REVIEW_REQUIRED");
            ApiError.require(!r.path("status").asText().equals("DRAFT")&&!r.path("status").asText().equals("CONFLICT"),403,"REVIEW_REQUIRED");
            ApiError.require(time(r,"endsAt").isAfter(now),403,"REVIEW_REQUIRED");
        }
        ApiError.require(review!=null&&review.path("method").asText().equals("HUMAN_ORIGINAL")&&!review.path("reviewer").asText().equals(author)&&review.path("goldenTests").isArray()&&!review.path("goldenTests").isEmpty(),403,"REVIEW_REQUIRED");
        if(!c.path("sources").isEmpty()||!c.path("rules").isEmpty()||!c.path("places").isEmpty()) {
            JsonNode p=proof(review.path("evidenceRef").asText(),"REVIEW_REQUIRED");
            ApiError.require(p.path("kind").asText().equals("ORIGINAL_REVIEW")&&p.path("reviewer").equals(review.path("reviewer"))&&p.path("catalogDigest").asText().equals(contentDigest(c))&&p.path("goldenPassed").asBoolean()&&p.path("goldenTests").equals(review.path("goldenTests")),403,"REVIEW_REQUIRED");
        }
    }
    String contentDigest(JsonNode catalog) {
        JsonNode c=catalog.deepCopy();
        for(JsonNode r:c.path("rules")) { ((ObjectNode)r).remove("review");((ObjectNode)r).put("status",r.has("calculation")?"DRAFT":"GUIDE_ONLY"); }
        for(JsonNode combination:c.path("combinations")) ((ObjectNode)combination).remove("review");
        return hash(bytes(c));
    }
}
