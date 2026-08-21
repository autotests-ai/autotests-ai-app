package tests;

import com.codeborne.selenide.Configuration;
import com.codeborne.selenide.WebDriverRunner;
import com.codeborne.selenide.logevents.SimpleReport;

import allure.AllureSelenideListeners;
import allure.Attachments;
import config.ConfigReader;
import config.TestConfig;
import helpers.BrowserSessionHelper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.openqa.selenium.MutableCapabilities;
import org.openqa.selenium.chrome.ChromeOptions;

import java.util.Map;

import static com.codeborne.selenide.Selenide.closeWebDriver;


public class TestBase {

    protected static final TestConfig config = ConfigReader.testConfig;
    private static final SimpleReport selenideReport = new SimpleReport();

    private static boolean allureResultsEnabled() {
        return !"none".equals(config.allureReportMode());
    }

    @BeforeAll
    static void setup() {
        if (config.logToConsole()) {
            System.setProperty("org.slf4j.simpleLogger.defaultLogLevel", config.rootLogLevel());
        } else {
            System.setProperty("org.slf4j.simpleLogger.defaultLogLevel", "off");
        }

        Configuration.baseUrl = ConfigReader.resolveBaseUrl();
        Configuration.browser = config.browser();
        Configuration.browserVersion = config.browserVersion();
        Configuration.browserSize = config.browserSize();
        Configuration.headless = config.headless();

        if (!config.remoteUrl().isBlank()) {
            Configuration.remote = config.remoteUrl();
            var capabilities = new MutableCapabilities();
            capabilities.setCapability("selenoid:options", Map.of(
                    "enableVNC", config.enableVnc(),
                    "enableVideo", config.enableVideo(),
                    "enableHar", config.enableHar(),
                    "headless", config.headless()
            ));
            Configuration.browserCapabilities = capabilities;
        } else if (config.headless()) {
            Configuration.browserCapabilities = new ChromeOptions()
                    .addArguments("--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage");
        }

        if (AllureSelenideListeners.isGloballyEnabled(config)) {
            AllureSelenideListeners.setEnabled(true);
        }
    }

    @BeforeEach
    void beforeEach() {
        if (config.logToConsole() && config.selenideLogToConsole()) {
            selenideReport.start();
        }
        if (!config.closeBrowserAfterEach() && WebDriverRunner.hasWebDriverStarted()) {
            BrowserSessionHelper.resetPageState();
        }
    }

    @AfterEach
    void afterEach(TestInfo testInfo) {
        if (config.logToConsole() && config.selenideLogToConsole()) {
            selenideReport.finish(testInfo.getDisplayName());
        }

        if (!allureResultsEnabled()) {
            if (config.closeBrowserAfterEach()) {
                closeWebDriver();
            }
            return;
        }

        if (config.attachBrowserConsoleLogs()) {
            Attachments.browserConsoleLogs();
        }
        if (config.attachPageSource()) {
            Attachments.pageSource();
        }

        if (config.attachHarLogs()) {
            Attachments.harLogs();
        }

        if (config.attachLastScreenshot()) {
            Attachments.screenshot("Last screenshot");
        }

        if (config.enableVideo() && config.attachVideo()) {
            Attachments.video();
        }
        if (config.closeBrowserAfterEach()) {
            closeWebDriver();
        }
    }

    @AfterAll
    static void afterAll() {
        if (config.closeBrowserAfterAll() && WebDriverRunner.hasWebDriverStarted()) {
            closeWebDriver();
        }
    }

}
