package dev.multistack.app.service;

import dev.multistack.app.dto.AuthResponse;
import dev.multistack.app.dto.LoginRequest;
import dev.multistack.app.dto.RegisterRequest;
import dev.multistack.app.dto.UserProfileResponse;
import dev.multistack.app.entity.UserEntity;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String POST_AUTH_REDIRECT = "/";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new AuthException(409, "Username already taken");
        }

        UserEntity user = new UserEntity(
                request.username(),
                passwordEncoder.encode(request.password())
        );
        try {
            // Flush inside the try so a concurrent insert that won the race surfaces here as 409
            // rather than escaping as a commit-time 500.
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new AuthException(409, "Username already taken");
        }
        return buildAuthResponse(user.getUsername());
    }

    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new AuthException(401, "Wrong login or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException(401, "Wrong login or password");
        }

        return buildAuthResponse(user.getUsername());
    }

    public UserProfileResponse profile(String username) {
        userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(401, "Unauthorized"));
        return new UserProfileResponse(username);
    }

    /**
     * Authenticated self-delete. Tokens are stateless, so a JWT issued earlier keeps verifying
     * after deletion — but every endpoint that resolves the user ({@code /me}, this one) answers
     * 401 once the row is gone. Also lets test suites clean up the users they register.
     */
    @Transactional
    public void deleteAccount(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(401, "Unauthorized"));
        userRepository.delete(user);
    }

    private AuthResponse buildAuthResponse(String username) {
        return new AuthResponse(
                jwtService.createToken(username),
                username,
                POST_AUTH_REDIRECT
        );
    }
}
