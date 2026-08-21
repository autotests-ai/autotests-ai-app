package dev.multistack.app.config;

import dev.multistack.app.entity.UserEntity;
import dev.multistack.app.repository.UserRepository;
import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@Epic("Authentication")
@Feature("User seeder")
@Severity(SeverityLevel.NORMAL)
@ExtendWith(MockitoExtension.class)
@DisplayName("UserSeeder")
class UserSeederTest extends UnitTestBase {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserSeeder userSeeder;

    @BeforeEach
    void setUp() {
        userSeeder = new UserSeeder(userRepository, passwordEncoder, "user1", "password1");
    }

    @Test
    @DisplayName("creates seed user when missing")
    void createsSeedUserWhenMissing() {
        when(userRepository.existsByUsername("user1")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("encoded-hash");

        userSeeder.run(mock(ApplicationArguments.class));

        var userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("user1", userCaptor.getValue().getUsername());
        assertEquals("encoded-hash", userCaptor.getValue().getPasswordHash());
    }

    @Test
    @DisplayName("skips seeding when user already exists")
    void skipsSeedingWhenUserExists() {
        when(userRepository.existsByUsername("user1")).thenReturn(true);

        userSeeder.run(mock(ApplicationArguments.class));

        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest(name = "username=\"{0}\" password=\"{1}\"")
    @CsvSource({
            "'', password1",
            "user1, ''",
            "'', ''"
    })
    @DisplayName("skips seeding when credentials are not configured")
    void skipsSeedingWhenCredentialsMissing(String username, String password) {
        var seeder = new UserSeeder(userRepository, passwordEncoder, username, password);

        seeder.run(mock(ApplicationArguments.class));

        verifyNoInteractions(userRepository);
    }
}
