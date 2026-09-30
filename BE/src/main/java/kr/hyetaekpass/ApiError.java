package kr.hyetaekpass;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

class ApiError extends RuntimeException {
    final int status; final String code;
    ApiError(int status, String code) { super(code); this.status=status; this.code=code; }
    static void require(boolean yes, int status, String code) { if (!yes) throw new ApiError(status,code); }
}

@RestControllerAdvice
class ErrorHandler {
    @ExceptionHandler(ApiError.class)
    ResponseEntity<?> known(ApiError e) { return ResponseEntity.status(e.status).body(Map.of("code",e.code,"message",e.code)); }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> database(DataAccessException e) { return ResponseEntity.status(503).body(Map.of("code","SAFETY_UNAVAILABLE","message","Operation unavailable")); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unknown(Exception e) { return ResponseEntity.badRequest().body(Map.of("code","INPUT_INVALID","message","Invalid request")); }
}
