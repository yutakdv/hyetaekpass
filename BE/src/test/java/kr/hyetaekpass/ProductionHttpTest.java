package kr.hyetaekpass;

import java.nio.file.*;
import java.net.*;
import java.net.http.*;
import java.security.*;
import java.security.interfaces.*;
import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.test.context.*;
import org.springframework.test.annotation.DirtiesContext;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.profiles.active=production","OIDC_ISSUER=https://issuer.test","OIDC_AUDIENCE=api-test","OPERATOR_PUBLISHERS=publisher","OPERATOR_REVIEWERS=reviewer","OPERATOR_AUTHORS=author","RETENTION_INTERVAL_MS=100"})
@Import(ProductionHttpTest.Transport.class)
@DirtiesContext
class ProductionHttpTest {
    static final String database="auth_test_"+UUID.randomUUID().toString().replace("-","");
    static final String adminUrl="jdbc:postgresql://127.0.0.1:54329/hyetaekpass";
    static final String password;
    static final KeyPair keys;
    static final Path journalDirectory;
    static {
        try {
            Properties secret=new Properties();try(var reader=Files.newBufferedReader(Path.of("../infra/local/.env"))){secret.load(reader);}password=secret.getProperty("DB_PASSWORD");
            try(var c=DriverManager.getConnection(adminUrl,"hyetaekpass",password);var s=c.createStatement()){s.execute("CREATE DATABASE "+database);}
            var gen=KeyPairGenerator.getInstance("RSA");gen.initialize(2048);keys=gen.generateKeyPair();journalDirectory=Files.createTempDirectory("production-auth-journal");
        } catch(Exception e){throw new ExceptionInInitializerError(e);}
    }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("DB_URL",()->"jdbc:postgresql://127.0.0.1:54329/"+database);r.add("DB_USER",()->"hyetaekpass");r.add("DB_PASSWORD",()->password);}
    @TestConfiguration static class Transport {
        @Bean JwtDecoder decoder(){var d=NimbusJwtDecoder.withPublicKey((RSAPublicKey)keys.getPublic()).build();d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer("https://issuer.test"),jwt->jwt.getAudience().contains("api-test")?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"))));return d;}
        @Bean @Primary LocalJournal localTestTransport(CatalogChecks checks){var env=new StandardEnvironment();env.setActiveProfiles("local");env.getPropertySources().addFirst(new MapPropertySource("test",Map.of("hyetaekpass.journal-dir",journalDirectory.toString())));return new LocalJournal(env,new OperatorAccess(env),checks);}
    }
    @LocalServerPort int port;
    @Autowired CatalogChecks checks;
    @Autowired javax.sql.DataSource dataSource;
    @Autowired Operations operations;
    final HttpClient client=HttpClient.newHttpClient();
    HttpResponse<String> call(String method,String path,String body,String bearer) throws Exception {
        var b=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");if(bearer!=null)b.header("Authorization","Bearer "+bearer);
        return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void opaqueOwnerDeletionBearerBypassesAdminJwtFilter() throws Exception {
        var report=call("POST","/v1/reports","{\"category\":\"TEST\",\"message\":\"production deletion regression\"}",null);
        assertEquals(201,report.statusCode());var data=checks.parse(report.body().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertEquals(204,call("DELETE","/v1/reports/"+data.path("id").asText(),null,data.path("deleteToken").asText()).statusCode());
        assertEquals(401,call("GET","/v1/admin/catalogs",null,data.path("deleteToken").asText()).statusCode());
        try(var connection=dataSource.getConnection();var s=connection.prepareStatement("SELECT count(*) FROM error_report WHERE id=?::uuid")){s.setString(1,data.path("id").asText());try(var rows=s.executeQuery()){rows.next();assertEquals(0,rows.getInt(1));}}
    }
    @Test void deploymentHealthKeepsRecoveryGateSeparate() throws Exception {
        operations.ready=false;
        try {assertEquals(200,call("GET","/healthz",null,null).statusCode());assertEquals(503,call("GET","/v1/bootstrap",null,null).statusCode());}
        finally {operations.replay("test-recovery");}
    }
    @Test void corsAllowsExactLocalUiOriginsAndRejectsForeignOrigins() throws Exception {
        for(String origin:List.of("http://127.0.0.1:5174","http://localhost:5174","http://127.0.0.1:8081","http://localhost:8081")) {
            var req=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/v1/admin/catalogs")).header("Origin",origin).header("Access-Control-Request-Method","GET").header("Access-Control-Request-Headers","X-Local-Subject,Content-Type,Authorization").method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build();
            var response=client.send(req,HttpResponse.BodyHandlers.ofString());assertEquals(200,response.statusCode());assertEquals(origin,response.headers().firstValue("Access-Control-Allow-Origin").orElse(""));assertTrue(response.headers().allValues("Vary").stream().anyMatch(v->v.contains("Origin")));
            var get=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/v1/bootstrap")).header("Origin",origin).GET().build();assertEquals(origin,client.send(get,HttpResponse.BodyHandlers.ofString()).headers().firstValue("Access-Control-Allow-Origin").orElse(""));
        }
        var foreign=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/v1/admin/catalogs")).header("Origin","https://foreign.invalid").header("Access-Control-Request-Method","GET").method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build();assertEquals(403,client.send(foreign,HttpResponse.BodyHandlers.ofString()).statusCode());
    }
    String signedToken(String subject,boolean mfa,String audience,String issuer,int expiresIn,KeyPair signingKeys) throws Exception {
        var claims=new com.nimbusds.jwt.JWTClaimsSet.Builder().subject(subject).issuer(issuer).audience(audience).issueTime(new java.util.Date()).expirationTime(new java.util.Date(System.currentTimeMillis()+expiresIn*1000L)).claim("amr",mfa?List.of("pwd","mfa"):List.of("pwd")).build();
        var token=new com.nimbusds.jwt.SignedJWT(new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.RS256),claims);token.sign(new com.nimbusds.jose.crypto.RSASSASigner((RSAPrivateKey)signingKeys.getPrivate()));return token.serialize();
    }
    @Test void productionHttpVerifiesSignatureIssuerAudienceExpiryMfaAndAllowlist() throws Exception {
        assertEquals(200,call("GET","/v1/admin/catalogs",null,signedToken("publisher",true,"api-test","https://issuer.test",120,keys)).statusCode());
        assertEquals(403,call("GET","/v1/admin/catalogs",null,signedToken("publisher",false,"api-test","https://issuer.test",120,keys)).statusCode());
        assertEquals(403,call("GET","/v1/admin/catalogs",null,signedToken("not-allowed",true,"api-test","https://issuer.test",120,keys)).statusCode());
        assertEquals(401,call("GET","/v1/admin/catalogs",null,signedToken("publisher",true,"other-api","https://issuer.test",120,keys)).statusCode());
        assertEquals(401,call("GET","/v1/admin/catalogs",null,signedToken("publisher",true,"api-test","https://other-issuer.test",120,keys)).statusCode());
        assertEquals(401,call("GET","/v1/admin/catalogs",null,signedToken("publisher",true,"api-test","https://issuer.test",-120,keys)).statusCode());
        var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);assertEquals(401,call("GET","/v1/admin/catalogs",null,signedToken("publisher",true,"api-test","https://issuer.test",120,generator.generateKeyPair())).statusCode());
    }
    @Test void scheduledRetentionDeletesBothExpiredConditionsAndKeepsBoundary() throws Exception {
        String old=UUID.randomUUID().toString(),closed=UUID.randomUUID().toString(),boundary=UUID.randomUUID().toString();
        try(var c=dataSource.getConnection();var s=c.prepareStatement("INSERT INTO error_report(id,category,message,token_hash,status,created_at,closed_at) VALUES (?::uuid,'TEST','synthetic retention evidence',?,'OPEN',now()-interval '90 days 1 minute',NULL), (?::uuid,'TEST','synthetic retention evidence',?,'CLOSED',now()-interval '40 days',now()-interval '30 days 1 minute'), (?::uuid,'TEST','synthetic retention boundary',?,'OPEN',now()-interval '89 days 23 hours 59 minutes',NULL)")) {
            int index=1;for(String id:List.of(old,closed,boundary)){s.setString(index++,id);s.setString(index++,CatalogChecks.hash(UUID.randomUUID().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)));}s.executeUpdate();
        }
        long until=System.nanoTime()+java.time.Duration.ofSeconds(10).toNanos();boolean deleted=false;
        while(System.nanoTime()<until) {
            try(var c=dataSource.getConnection();var s=c.prepareStatement("SELECT count(*) FROM error_report WHERE id IN (?::uuid,?::uuid)")){s.setString(1,old);s.setString(2,closed);try(var rows=s.executeQuery()){rows.next();deleted=rows.getInt(1)==0;}}
            if(deleted)break;Thread.sleep(25);
        }
        assertTrue(deleted,"scheduled retention must delete expired rows");
        var events=operations.journal.read();for(String id:List.of(old,closed))assertTrue(events.stream().anyMatch(e->e.path("type").asText().equals("REPORT_DELETE")&&e.path("target").asText().equals(id)&&e.path("actor").asText().equals("retention")));
        assertFalse(events.stream().anyMatch(e->e.path("target").asText().equals(boundary)));
        operations.verify(events);
        try(var c=dataSource.getConnection();var s=c.prepareStatement("SELECT count(*) FROM error_report WHERE id=?::uuid")){s.setString(1,boundary);try(var rows=s.executeQuery()){rows.next();assertEquals(1,rows.getInt(1));}}
    }
    @AfterAll static void cleanup(@Autowired javax.sql.DataSource ds) throws Exception {
        ((com.zaxxer.hikari.HikariDataSource)ds).close();
        try(var c=DriverManager.getConnection(adminUrl,"hyetaekpass",password);var s=c.createStatement()){s.execute("DROP DATABASE "+database+" WITH (FORCE)");}
        try(var paths=Files.walk(journalDirectory)){for(Path path:paths.sorted(Comparator.reverseOrder()).toList())Files.delete(path);}
    }
}
