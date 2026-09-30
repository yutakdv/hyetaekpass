package kr.hyetaekpass;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.io.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.core.sync.RequestBody;

@Component
class LocalJournal {
    final Path directory;
    final boolean local;
    final CatalogChecks checks;
    final String mode,bucket;
    final S3Client s3;
    LocalJournal(Environment env,OperatorAccess access,CatalogChecks checks) {
        this.checks=checks;local=access.local;directory=Path.of(env.getProperty("hyetaekpass.journal-dir")).toAbsolutePath();
        mode=env.getProperty("JOURNAL_MODE",local?"file":"s3");bucket=env.getProperty("JOURNAL_BUCKET","");
        s3=mode.equals("s3")&&!bucket.isBlank()?PrivateS3.client(env,"JOURNAL_ENDPOINT"):null;
    }
    // ponytail: one active writer; S3 conditional sequence claims reject concurrent writers for replay.
    synchronized JsonNode append(String type,String target,Map<String,Object> payload,String actor) {
        ApiError.require(mode.equals("s3")||local&&mode.equals("file"),503,"JOURNAL_UNAVAILABLE");
        var events=read();long sequence=events.size()+1L;
        var event=new LinkedHashMap<String,Object>(); event.put("sequence",sequence);event.put("eventId",UUID.randomUUID().toString());event.put("type",type);event.put("target",target);event.put("payload",payload);event.put("actor",actor);event.put("createdAt",Instant.now().toString());
        if(mode.equals("s3"))event.put("previousDigest",events.isEmpty()?"0".repeat(64):CatalogChecks.hash(checks.bytes(events.getLast())));
        byte[] bytes=checks.bytes(event);String filename=String.format("%020d_%s.json",sequence,event.get("eventId"));
        if(mode.equals("s3"))return appendS3(sequence,bytes);
        try {
            Files.createDirectories(directory);
            Path temp=directory.resolve(filename+".pending");
            forceWrite(temp,bytes);Files.move(temp,directory.resolve(filename),StandardCopyOption.ATOMIC_MOVE);forceDirectory();
            forceWrite(directory.resolve("head.pending"),checks.bytes(Map.of("sequence",sequence,"digest",CatalogChecks.hash(bytes))));
            Files.move(directory.resolve("head.pending"),directory.resolve("head.json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);forceDirectory();
            return checks.parse(bytes);
        } catch(IOException e) { throw new ApiError(503,"JOURNAL_UNAVAILABLE"); }
    }
    synchronized List<JsonNode> read() {
        if(mode.equals("s3"))return readS3();
        ApiError.require(local&&mode.equals("file"),503,"JOURNAL_UNAVAILABLE");
        try {
            Files.createDirectories(directory);
            try(var paths=Files.list(directory)) {
                List<Path> files=paths.filter(p->p.getFileName().toString().matches("[0-9]{20}_[a-f0-9-]{36}\\.json")).sorted().toList();
                var result=new ArrayList<JsonNode>();long seq=0;
                for(Path file:files) {
                    ApiError.require(!Files.isSymbolicLink(file)&&Files.size(file)<65536,503,"JOURNAL_UNAVAILABLE");
                    JsonNode event=checks.parse(Files.readAllBytes(file));
                    ApiError.require(event.path("sequence").asLong()==++seq&&file.getFileName().toString().equals(String.format("%020d_%s.json",seq,event.path("eventId").asText())),503,"JOURNAL_UNAVAILABLE");result.add(event);
                }
                if(!result.isEmpty()) {
                    Path headPath=directory.resolve("head.json");ApiError.require(Files.isRegularFile(headPath),503,"JOURNAL_UNAVAILABLE");
                    JsonNode head=checks.parse(Files.readAllBytes(headPath));
                    ApiError.require(head.path("sequence").asLong()==seq&&head.path("digest").asText().equals(CatalogChecks.hash(Files.readAllBytes(files.getLast()))),503,"JOURNAL_UNAVAILABLE");
                } else ApiError.require(!Files.exists(directory.resolve("head.json")),503,"JOURNAL_UNAVAILABLE");
                return result;
            }
        } catch(IOException e) { throw new ApiError(503,"JOURNAL_UNAVAILABLE"); }
    }
    void forceWrite(Path path,byte[] data) throws IOException { try(var out=FileChannel.open(path,StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING,StandardOpenOption.WRITE)) {var b=java.nio.ByteBuffer.wrap(data);while(b.hasRemaining())out.write(b);out.force(true);} }
    void forceDirectory() throws IOException {try(var directoryChannel=FileChannel.open(directory,StandardOpenOption.READ)){directoryChannel.force(true);} }
    byte[] getS3(String key) {
        try {return PrivateS3.read(s3,bucket,key);}catch(IOException e){throw new ApiError(503,"JOURNAL_UNAVAILABLE");}
    }
    void privateVersionedBucket() {
        PrivateS3.verify(s3,bucket);
    }
    List<JsonNode> readS3() {
        try {
            privateVersionedBucket();var files=new TreeMap<String,Long>();
            for(var page:s3.listObjectsV2Paginator(ListObjectsV2Request.builder().bucket(bucket).prefix("journal/").build()))for(var object:page.contents())if(object.key().matches("journal/[0-9]{20}\\.json")) {ApiError.require(object.size()<=65536,503,"JOURNAL_UNAVAILABLE");files.put(object.key(),object.size());}
            var result=new ArrayList<JsonNode>();long sequence=0;String previous="0".repeat(64);
            for(String key:files.keySet()) {
                byte[] bytes=getS3(key);JsonNode event=checks.parse(bytes);
                ApiError.require(event.path("sequence").asLong()==++sequence&&key.equals(String.format("journal/%020d.json",sequence))&&event.path("previousDigest").asText().equals(previous),503,"JOURNAL_UNAVAILABLE");
                previous=CatalogChecks.hash(bytes);result.add(event);
            }
            byte[] head=null;try {head=getS3("journal/head.json");}catch(NoSuchKeyException e){ApiError.require(result.isEmpty(),503,"JOURNAL_UNAVAILABLE");}
            if(head!=null){var h=checks.parse(head);ApiError.require(h.path("sequence").asLong()==sequence&&h.path("digest").asText().equals(previous),503,"JOURNAL_UNAVAILABLE");}
            return result;
        } catch(Exception e) {throw new ApiError(503,"JOURNAL_UNAVAILABLE");}
    }
    JsonNode appendS3(long sequence,byte[] bytes) {
        try {
            String etag=null;try {etag=s3.headObject(HeadObjectRequest.builder().bucket(bucket).key("journal/head.json").build()).eTag();}catch(S3Exception e){if(e.statusCode()!=404)throw e;}
            String key=String.format("journal/%020d.json",sequence);
            var put=s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).ifNoneMatch("*").checksumSHA256(Base64.getEncoder().encodeToString(java.security.MessageDigest.getInstance("SHA-256").digest(bytes))).contentType("application/json").build(),RequestBody.fromBytes(bytes));
            ApiError.require(put.versionId()!=null&&Arrays.equals(getS3(key),bytes),503,"JOURNAL_UNAVAILABLE");
            byte[] head=checks.bytes(Map.of("sequence",sequence,"digest",CatalogChecks.hash(bytes)));
            var builder=PutObjectRequest.builder().bucket(bucket).key("journal/head.json").contentType("application/json");
            if(etag==null)builder.ifNoneMatch("*");else builder.ifMatch(etag);
            var headResult=s3.putObject(builder.build(),RequestBody.fromBytes(head));
            ApiError.require(headResult.versionId()!=null&&Arrays.equals(head,getS3("journal/head.json")),503,"JOURNAL_UNAVAILABLE");return checks.parse(bytes);
        }catch(Exception e){var error=new ApiError(503,"JOURNAL_UNAVAILABLE");error.initCause(e);throw error;}
    }
}
