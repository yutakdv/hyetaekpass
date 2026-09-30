package kr.hyetaekpass;
import java.lang.reflect.Proxy;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;

class OperatorAccessTest {
    HttpServletRequest request(String address) {return (HttpServletRequest)Proxy.newProxyInstance(getClass().getClassLoader(),new Class[]{HttpServletRequest.class},(proxy,method,args)->switch(method.getName()){case "getRemoteAddr"->address;case "getHeader"->"publisher";default->null;});}
    @Test void localHeaderCannotAuthorizeRemoteCaller() {
        var env=new StandardEnvironment();env.setActiveProfiles("local");var access=new OperatorAccess(env);
        assertEquals(403,assertThrows(ApiError.class,()->access.subject(request("192.0.2.1"),"PUBLISHERS")).status);
        assertEquals("publisher",access.subject(request("127.0.0.1"),"PUBLISHERS"));
    }
    @Test void verifiedJwtPrincipalStillNeedsMfaAndRoleAllowlist() {
        var env=new StandardEnvironment();env.setActiveProfiles("production");env.getPropertySources().addFirst(new MapPropertySource("test",Map.of("OPERATOR_PUBLISHERS","publisher")));
        var access=new OperatorAccess(env);var now=java.time.Instant.now();
        try {
            Jwt noMfa=Jwt.withTokenValue(UUID.randomUUID().toString()).header("alg","RS256").subject("publisher").issuedAt(now).expiresAt(now.plusSeconds(60)).build();
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(noMfa));
            assertEquals(403,assertThrows(ApiError.class,()->access.subject(request("127.0.0.1"),"PUBLISHERS")).status);
            Jwt mfa=Jwt.withTokenValue(UUID.randomUUID().toString()).header("alg","RS256").subject("publisher").issuedAt(now).expiresAt(now.plusSeconds(60)).claim("amr",List.of("mfa")).build();
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(mfa));
            assertEquals("publisher",access.subject(request("192.0.2.1"),"PUBLISHERS"));
            assertEquals(403,assertThrows(ApiError.class,()->access.subject(request("127.0.0.1"),"AUTHORS")).status);
        }finally {SecurityContextHolder.clearContext();}
    }
}
