package kr.hyetaekpass;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1")
class Api {
    final Operations operations;final OperatorAccess access;final CatalogChecks checks;
    Api(Operations operations,OperatorAccess access,CatalogChecks checks){this.operations=operations;this.access=access;this.checks=checks;}
    @GetMapping("/bootstrap") ResponseEntity<?> bootstrap(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(operations.bootstrap());}
    @GetMapping("/catalog/{id}") ResponseEntity<byte[]> catalog(@PathVariable String id){return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable()).body(operations.catalog(id));}
    @PostMapping("/reports") ResponseEntity<?> report(@RequestBody byte[] body,HttpServletRequest request){return ResponseEntity.status(201).body(operations.report(checks.parse(body),request.getRemoteAddr()));}
    @DeleteMapping("/reports/{id}") ResponseEntity<?> deleteReport(@PathVariable String id,@RequestHeader(value="Authorization",required=false)String authorization){ApiError.require(authorization!=null&&authorization.startsWith("Bearer "),401,"UNAUTHENTICATED");operations.deleteReport(id,authorization.substring(7),"report-owner");return ResponseEntity.noContent().build();}
    @GetMapping("/admin/catalogs") Object catalogs(HttpServletRequest request){access.reader(request);return operations.catalogs();}
    @PostMapping("/admin/import") Object importCatalog(@RequestBody byte[] body,HttpServletRequest request){return operations.importCatalog(body,access.subject(request,"AUTHORS"));}
    @PatchMapping("/admin/catalogs/{id}") Object edit(@PathVariable String id,@RequestBody byte[] body,HttpServletRequest request){return operations.edit(id,body,access.subject(request,"AUTHORS"));}
    @PostMapping("/admin/catalogs/{id}/review") Object review(@PathVariable String id,@RequestBody byte[] body,HttpServletRequest request){return operations.review(id,checks.parse(body),access.subject(request,"REVIEWERS"));}
    @PostMapping("/admin/catalogs/{id}/publish") Object publish(@PathVariable String id,@RequestBody byte[] body,HttpServletRequest request){return operations.publish(id,checks.parse(body),access.subject(request,"PUBLISHERS"));}
    @PostMapping("/admin/rollback") Object rollback(@RequestBody byte[] body,HttpServletRequest request){return operations.rollback(checks.parse(body),access.subject(request,"PUBLISHERS"));}
    @PostMapping("/admin/suspensions") Object suspend(@RequestBody byte[] body,HttpServletRequest request){return operations.suspend(checks.parse(body),access.subject(request,"PUBLISHERS"));}
    @GetMapping("/admin/reports") Object reports(HttpServletRequest request){return operations.reports(access.subject(request,"REVIEWERS"));}
    @PatchMapping("/admin/reports/{id}") Object updateReport(@PathVariable String id,@RequestBody byte[] body,HttpServletRequest request){return operations.updateReport(id,checks.parse(body),access.subject(request,"REVIEWERS"));}
    @DeleteMapping("/admin/reports/{id}") ResponseEntity<?> deleteAdminReport(@PathVariable String id,HttpServletRequest request){operations.deleteReport(id,null,access.subject(request,"REVIEWERS"));return ResponseEntity.noContent().build();}
    @GetMapping("/admin/audit") Object audit(HttpServletRequest request){return operations.audits(access.reader(request));}
    @PostMapping("/admin/recovery/replay") Object replay(HttpServletRequest request){return operations.replay(access.subject(request,"PUBLISHERS"));}
}

@RestController
class Health {
    final Operations operations;
    Health(Operations operations){this.operations=operations;}
    @GetMapping("/healthz") ResponseEntity<?> health(){operations.health();return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(java.util.Map.of("healthy",true));}
}
