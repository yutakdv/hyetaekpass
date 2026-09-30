package kr.hyetaekpass;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.net.InetAddress;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

@Component
class OperatorAccess {
    final boolean local;
    final Environment env;
    OperatorAccess(Environment env) { this.env=env; local=Arrays.asList(env.getActiveProfiles()).equals(List.of("local")); }
    String subject(HttpServletRequest request,String role) {
        String subject;
        if(local) {
            try { ApiError.require(InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress(),403,"FORBIDDEN"); }
            catch(java.net.UnknownHostException e) { throw new ApiError(403,"FORBIDDEN"); }
            subject=request.getHeader("X-Local-Subject");
            ApiError.require(subject!=null&&!subject.isBlank(),401,"UNAUTHENTICATED");
        } else {
            var auth=SecurityContextHolder.getContext().getAuthentication();
            ApiError.require(auth!=null&&auth.getPrincipal() instanceof Jwt,401,"UNAUTHENTICATED");
            Jwt jwt=(Jwt)auth.getPrincipal(); subject=jwt.getSubject();
            List<String> amr=jwt.getClaimAsStringList("amr");
            ApiError.require(amr!=null&&amr.contains("mfa"),403,"FORBIDDEN");
        }
        String defaults=local?switch(role) {case "AUTHORS"->"author,test-importer";case "REVIEWERS"->"reviewer";case "PUBLISHERS"->"publisher";default->"";}:"";
        Set<String> allow=new HashSet<>(Arrays.asList(env.getProperty("OPERATOR_"+role,defaults).split(",")));
        ApiError.require(subject!=null&&subject.length()<=160&&!subject.isBlank()&&subject.chars().noneMatch(Character::isISOControl)&&allow.contains(subject),403,"FORBIDDEN");
        return subject;
    }
    String reader(HttpServletRequest request) {
        try { return subject(request,"REVIEWERS"); } catch(ApiError e) { if(e.status==401)throw e; }
        try { return subject(request,"PUBLISHERS"); } catch(ApiError e) { if(e.status==401)throw e; }
        return subject(request,"AUTHORS");
    }
}

@Configuration
class SecurityConfiguration {
    @Bean
    SecurityFilterChain security(HttpSecurity http,OperatorAccess access,Environment env,org.springframework.beans.factory.ObjectProvider<JwtDecoder> decoders) throws Exception {
        http.csrf(c->c.disable()).cors(Customizer.withDefaults()).sessionManagement(s->s.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS));
        if(access.local) http.authorizeHttpRequests(a->a.anyRequest().permitAll());
        else {
            String issuer=env.getProperty("OIDC_ISSUER"); String audience=env.getProperty("OIDC_AUDIENCE");
            if(issuer==null||audience==null||!issuer.startsWith("https://")) throw new IllegalStateException("Configure verified OIDC issuer and audience for production");
            JwtDecoder decoder=decoders.getIfAvailable(()->{
                NimbusJwtDecoder configured=(NimbusJwtDecoder)JwtDecoders.fromIssuerLocation(issuer);
                configured.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer), jwt->jwt.getAudience().contains(audience)?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"))));return configured;
            });
            var adminBearer=new DefaultBearerTokenResolver();
            http.authorizeHttpRequests(a->a.requestMatchers("/v1/admin/**").authenticated().anyRequest().permitAll()).oauth2ResourceServer(o->o.bearerTokenResolver(req->req.getServletPath().equals("/v1/admin")||req.getServletPath().startsWith("/v1/admin/")?adminBearer.resolve(req):null).jwt(j->j.decoder(decoder)).authenticationEntryPoint((req,res,e)->jsonError(res,401,"UNAUTHENTICATED")));
        }
        return http.build();
    }
    @Bean CorsConfigurationSource corsConfigurationSource(Environment env) {
        var c=new CorsConfiguration();
        c.setAllowedOrigins(Arrays.asList(env.getProperty("ADMIN_ORIGINS","http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8081,http://127.0.0.1:8081").split(",")));
        c.setAllowedMethods(List.of("GET","POST","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("Content-Type","Authorization","X-Local-Subject"));
        var source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",c); return source;
    }
    static void jsonError(HttpServletResponse res,int status,String code) throws IOException { res.setStatus(status);res.setContentType("application/json");res.getWriter().write("{\"code\":\""+code+"\",\"message\":\""+code+"\"}"); }
    @Bean FilterRegistrationBean<OncePerRequestFilter> requestLimits() {
        var registration=new FilterRegistrationBean<OncePerRequestFilter>();
        registration.setFilter(new OncePerRequestFilter() {
            protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws IOException,ServletException {
                if(!Set.of("POST","PATCH").contains(req.getMethod())) { chain.doFilter(req,res);return; }
                int max=req.getRequestURI().equals("/v1/admin/import")||req.getRequestURI().matches("/v1/admin/catalogs/[a-f0-9-]+")?5*1024*1024:8192;
                byte[] bytes=req.getInputStream().readNBytes(max+1);
                if(bytes.length>max) { jsonError(res,413,"TOO_LARGE");return; }
                chain.doFilter(new HttpServletRequestWrapper(req) {
                    public ServletInputStream getInputStream() { var in=new ByteArrayInputStream(bytes);return new ServletInputStream() {public int read(){return in.read();}public boolean isFinished(){return in.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener l){throw new UnsupportedOperationException();}}; }
                    public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),java.nio.charset.StandardCharsets.UTF_8));}
                },res);
            }
        });registration.setOrder(-200); return registration;
    }
}
