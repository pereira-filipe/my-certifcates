package dev.filipe.mycertificates.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Turns every exception thrown by a controller into an {@link ApiError}. Never exposes stack traces. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return respond(new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        return respond(new ApiError(400, "MALFORMED_REQUEST", "The request body is missing or invalid"));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleTooLarge(MaxUploadSizeExceededException ex) {
        return respond(new ApiError(413, "FILE_TOO_LARGE", "The file is too large"));
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        return respond(new ApiError(404, "NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleOther(Exception ex) {
        // Spring's own web exceptions (unknown route, wrong method, ResponseStatusException, ...)
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            return respond(new ApiError(status.value(), errorCode(status), reason(status)));
        }
        log.error("Unexpected error", ex);
        return respond(new ApiError(500, "INTERNAL_ERROR", "Something went wrong"));
    }

    private static ResponseEntity<ApiError> respond(ApiError body) {
        return ResponseEntity.status(body.status()).body(body);
    }

    private static String errorCode(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        return known != null ? known.name() : "HTTP_" + status.value();
    }

    private static String reason(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        return known != null ? known.getReasonPhrase() : "Error";
    }
}
