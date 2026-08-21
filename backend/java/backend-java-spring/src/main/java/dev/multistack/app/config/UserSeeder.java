package dev.multistack.app.config;

import dev.multistack.app.entity.UserEntity;
import dev.multistack.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the demo account the demo frontends and test suites log in with.
 * Credentials come from configuration ({@code app.seed.*}); leaving either value
 * blank disables seeding, which is how a real deployment opts out.
 */
@Component
public class UserSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedUsername;
    private final String seedPassword;

    public UserSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.username:}") String seedUsername,
            @Value("${app.seed.password:}") String seedPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedUsername = seedUsername;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (seedUsername.isBlank() || seedPassword.isBlank()) {
            return;
        }
        if (!userRepository.existsByUsername(seedUsername)) {
            userRepository.save(new UserEntity(
                    seedUsername,
                    passwordEncoder.encode(seedPassword)
            ));
        }
    }
}
