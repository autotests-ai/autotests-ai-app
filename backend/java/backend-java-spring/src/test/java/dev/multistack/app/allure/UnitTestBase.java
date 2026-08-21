package dev.multistack.app.allure;

import io.qameta.allure.Owner;

/**
 * Shared Allure labels for backend unit results (local and CI → TestOps).
 */
@Owner("stanislav")
@Layer("unit")
@Module("backend-java-spring")
@Language("java")
public abstract class UnitTestBase {
}
