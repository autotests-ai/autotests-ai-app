package dev.multistack.app.repository;

import dev.multistack.app.entity.UserEntity;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("Persistence")
@Feature("User repository")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("UserRepository on real PostgreSQL")
class UserRepositoryTest extends PostgresSliceTestBase {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("findByUsername returns the saved user with generated id and created_at")
    void findByUsernameReturnsSavedUser() {
        userRepository.saveAndFlush(new UserEntity("alice", "bcrypt-hash-placeholder"));

        Optional<UserEntity> found = userRepository.findByUsername("alice");

        assertTrue(found.isPresent());
        assertEquals("alice", found.get().getUsername());
        assertEquals("bcrypt-hash-placeholder", found.get().getPasswordHash());
        assertNotNull(found.get().getId());
        assertNotNull(found.get().getCreatedAt());
        assertTrue(userRepository.existsByUsername("alice"));
    }

    @Test
    @DisplayName("findByUsername is empty for an unknown user")
    void findByUsernameEmptyForUnknownUser() {
        assertTrue(userRepository.findByUsername("nobody").isEmpty());
        assertFalse(userRepository.existsByUsername("nobody"));
    }

    @Test
    @DisplayName("duplicate username violates the real unique constraint (V2)")
    void duplicateUsernameViolatesUniqueConstraint() {
        userRepository.saveAndFlush(new UserEntity("bob", "hash-one"));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> userRepository.saveAndFlush(new UserEntity("bob", "hash-two")));
    }
}
