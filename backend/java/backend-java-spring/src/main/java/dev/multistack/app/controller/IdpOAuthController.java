package dev.multistack.app.controller;

import dev.multistack.app.dto.IdpOAuthLoginResponse;
import dev.multistack.app.dto.IdpOAuthRequest;
import dev.multistack.app.dto.IdpOAuthSession;
import dev.multistack.app.service.IdpOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/oauth")
public class IdpOAuthController {

    private final IdpOAuthService idpOAuthService;

    public IdpOAuthController(IdpOAuthService idpOAuthService) {
        this.idpOAuthService = idpOAuthService;
    }

    @PostMapping("/idp")
    public IdpOAuthLoginResponse idp(
            @Valid @RequestBody IdpOAuthRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        IdpOAuthSession session = idpOAuthService.exchange(request);
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                idpOAuthService.toCookie(session.accessToken(), httpRequest.isSecure()).toString());
        return new IdpOAuthLoginResponse(session.login());
    }
}
