package dev.filipe.mycertificates.common;

import dev.filipe.mycertificates.web.IndexHtml;
import dev.filipe.mycertificates.web.SpaController;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns every exception thrown by a controller into an {@link ApiError}. Never exposes stack traces. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final IndexHtml indexHtml;

    public GlobalExceptionHandler(IndexHtml indexHtml) {
        this.indexHtml = indexHtml;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return respond(new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid", fields));
    }

    @ExceptionHandler(FieldValidationException.class)
    ResponseEntity<ApiError> handleFieldValidation(FieldValidationException ex) {
        return respond(new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid", ex.getFields()));
    }

    /** A malformed id in the URL (e.g. not a UUID) is just an unknown id; a bad query parameter is a 400. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        if (ex.getParameter().hasParameterAnnotation(PathVariable.class)) {
            return respond(new ApiError(404, "NOT_FOUND", "Not found"));
        }
        return respond(new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid",
                Map.of(ex.getName(), "has an invalid value")));
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
    ResponseEntity<?> handleOther(Exception ex, HttpServletRequest request) {
        // An unknown page (not /api) opened in a browser gets the app, which shows its "Page not found".
        if (ex instanceof NoResourceFoundException && isPageRequest(request) && indexHtml.get().isPresent()) {
            return ResponseEntity.status(404).contentType(SpaController.HTML_UTF8)
                    .cacheControl(CacheControl.noCache()).body(indexHtml.get().get());
        }
        // Spring's own web exceptions (unknown route, wrong method, ResponseStatusException, ...)
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            return respond(new ApiError(status.value(), errorCode(status), reason(status)));
        }
        log.error("Unexpected error", ex);
        return respond(new ApiError(500, "INTERNAL_ERROR", "Something went wrong"));
    }

    private static boolean isPageRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return "GET".equals(request.getMethod()) && !request.getRequestURI().startsWith("/api/")
                && accept != null && accept.contains(MediaType.TEXT_HTML_VALUE);
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
