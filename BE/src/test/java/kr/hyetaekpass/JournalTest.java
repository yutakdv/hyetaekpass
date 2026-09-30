package kr.hyetaekpass;

import java.util.*;
import java.nio.file.*;
import com.sun.net.httpserver.HttpServer;
import org.springframework.core.env.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class JournalTest {
    static StandardEnvironment environment(Path dir,Map<String,Object> options) {
        var env=new StandardEnvironment();env.setActiveProfiles("local");var values=new HashMap<String,Object>(options);values.put("hyetaekpass.journal-dir",dir.toString());env.getPropertySources().addFirst(new MapPropertySource("test",values));return env;
    }
    @Test void configuredS3FailureNeverFallsBackToLocalFilesystem() throws Exception {
        var server=HttpServer.create(new java.net.InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/", exchange->{exchange.sendResponseHeaders(503,-1);exchange.close();});server.start();
        Path dir=Files.createTempDirectory("journal-test");
        try {
            var env=environment(dir,Map.of("JOURNAL_MODE","s3","JOURNAL_BUCKET","test-journal","JOURNAL_ENDPOINT","http://127.0.0.1:"+server.getAddress().getPort()));
            var checks=new CatalogChecks(env);var journal=new LocalJournal(env,new OperatorAccess(env),checks);
            ApiError error=assertThrows(ApiError.class,journal::read);
            assertEquals(503,error.status);assertEquals("JOURNAL_UNAVAILABLE",error.code);
            assertEquals(0,Files.list(dir).count());
        } finally {server.stop(0);Files.deleteIfExists(dir);}
    }
    @Test void s3WritesReadBackAndChecksumRejectsCorruption() throws Exception {
        var objects=new java.util.concurrent.ConcurrentHashMap<String,byte[]>();
        var server=HttpServer.create(new java.net.InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            String path=exchange.getRequestURI().getPath(), query=String.valueOf(exchange.getRequestURI().getQuery());
            String response=null;byte[] bytes=null;int status=200;
            if(query.contains("versioning"))response="<VersioningConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Status>Enabled</Status></VersioningConfiguration>";
            else if(query.contains("publicAccessBlock"))response="<PublicAccessBlockConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><BlockPublicAcls>true</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets></PublicAccessBlockConfiguration>";
            else if(query.contains("list-type")){
                var xml=new StringBuilder("<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><IsTruncated>false</IsTruncated>");
                objects.forEach((k,v)->xml.append("<Contents><Key>").append(k.substring("/test-journal/".length())).append("</Key><Size>").append(v.length).append("</Size></Contents>"));response=xml.append("</ListBucketResult>").toString();
            } else if(exchange.getRequestMethod().equals("PUT")) {
                String match=exchange.getRequestHeaders().getFirst("If-None-Match");
                if("*".equals(match)&&objects.containsKey(path)){status=412;response="<Error><Code>PreconditionFailed</Code></Error>";}
                else {objects.put(path,exchange.getRequestBody().readAllBytes());exchange.getResponseHeaders().set("x-amz-version-id",UUID.randomUUID().toString());}
            } else {
                bytes=objects.get(path);
                if(bytes==null){status=404;response="<Error><Code>NoSuchKey</Code></Error>";}
                else {exchange.getResponseHeaders().set("x-amz-version-id","v1");exchange.getResponseHeaders().set("ETag","\""+CatalogChecks.hash(bytes)+"\"");}
            }
            if(response!=null)bytes=response.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if(exchange.getRequestMethod().equals("HEAD")){exchange.sendResponseHeaders(status,-1);}
            else if(bytes==null||bytes.length==0)exchange.sendResponseHeaders(status,-1);
            else {exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);}
            exchange.close();
        });server.start();Path dir=Files.createTempDirectory("journal-s3-test");
        try {
            var env=environment(dir,Map.of("JOURNAL_MODE","s3","JOURNAL_BUCKET","test-journal","JOURNAL_ENDPOINT","http://127.0.0.1:"+server.getAddress().getPort()));
            var checks=new CatalogChecks(env);var journal=new LocalJournal(env,new OperatorAccess(env),checks);
            assertTrue(journal.read().isEmpty());
            journal.append("REPORT_DELETE",UUID.randomUUID().toString(),Map.of(),"test");
            assertEquals(1,journal.read().size());
            journal.append("SUSPEND","safety",Map.of("blockedRuleIds",List.of("test"),"blockedSourceIds",List.of(),"flags",Map.of()),"test");
            assertEquals(2,journal.read().size());
            String first="/test-journal/journal/00000000000000000001.json";
            objects.put(first,new String(objects.get(first),java.nio.charset.StandardCharsets.UTF_8).replace("REPORT_DELETE","REPORT_CORRUPT").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            assertEquals(503,assertThrows(ApiError.class,journal::read).status);
            try(var files=Files.list(dir)){assertEquals(0,files.count());}
        }finally {server.stop(0);Files.deleteIfExists(dir);}
    }
}
