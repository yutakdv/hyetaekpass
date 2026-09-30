package kr.hyetaekpass;

import com.sun.net.httpserver.HttpServer;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EvidenceTest {
    @Test void s3EvidenceRequiresPrivateVersionedBucketAndBoundedVersionedObject() throws Exception {
        var privateBucket=new AtomicBoolean(true);var versioned=new AtomicBoolean(true);var objectVersion=new AtomicBoolean(true);var oversized=new AtomicBoolean(false);
        var server=HttpServer.create(new java.net.InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            String query=String.valueOf(exchange.getRequestURI().getQuery());String body;
            if(query.contains("versioning"))body="<VersioningConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Status>"+(versioned.get()?"Enabled":"Suspended")+"</Status></VersioningConfiguration>";
            else if(query.contains("publicAccessBlock"))body="<PublicAccessBlockConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><BlockPublicAcls>"+privateBucket.get()+"</BlockPublicAcls><IgnorePublicAcls>true</IgnorePublicAcls><BlockPublicPolicy>true</BlockPublicPolicy><RestrictPublicBuckets>true</RestrictPublicBuckets></PublicAccessBlockConfiguration>";
            else {body=oversized.get()?"x".repeat(65537):"{\"kind\":\"RIGHTS_GRANT\"}";if(objectVersion.get())exchange.getResponseHeaders().set("x-amz-version-id","evidence-v1");}
            byte[] bytes=body.getBytes(java.nio.charset.StandardCharsets.UTF_8);exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });server.start();Path dir=Files.createTempDirectory("private-evidence-test");
        try {
            var env=JournalTest.environment(dir,Map.of("EVIDENCE_BUCKET","test-evidence","EVIDENCE_ENDPOINT","http://127.0.0.1:"+server.getAddress().getPort()));var checks=new CatalogChecks(env);
            assertEquals("RIGHTS_GRANT",checks.proof("grant","RIGHTS_REQUIRED").path("kind").asText());
            privateBucket.set(false);assertEquals(403,assertThrows(ApiError.class,()->checks.proof("grant","RIGHTS_REQUIRED")).status);privateBucket.set(true);
            versioned.set(false);assertThrows(ApiError.class,()->checks.proof("grant","RIGHTS_REQUIRED"));versioned.set(true);
            objectVersion.set(false);assertThrows(ApiError.class,()->checks.proof("grant","RIGHTS_REQUIRED"));objectVersion.set(true);
            oversized.set(true);assertThrows(ApiError.class,()->checks.proof("grant","RIGHTS_REQUIRED"));
        } finally {server.stop(0);Files.delete(dir);}
    }
}
