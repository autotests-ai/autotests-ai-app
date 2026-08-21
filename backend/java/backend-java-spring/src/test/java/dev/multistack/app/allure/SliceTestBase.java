package dev.multistack.app.allure;

import io.qameta.allure.Owner;

/**
 * Shared Allure labels for Spring slice tests ({@code @WebMvcTest}, {@code @DataJpaTest}).
 * Same pyramid layer and CI job as plain unit tests ({@code layer=unit} / job
 * {@code unit-tests}). {@code suite=slice} separates partial-Spring-context tests
 * from one-class-in-isolation units in the report — not a sixth pyramid layer.
 */
@Owner("stanislav")
@Layer("unit")
@Suite("slice")
@Module("backend-java-spring")
@Language("java")
public abstract class SliceTestBase {
}
