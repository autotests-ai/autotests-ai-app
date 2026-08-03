package helpers;

import com.codeborne.selenide.WebDriverRunner;
import io.qameta.allure.Step;

import static com.codeborne.selenide.Selenide.clearBrowserCookies;
import static com.codeborne.selenide.Selenide.localStorage;
import static com.codeborne.selenide.Selenide.sessionStorage;
import static com.codeborne.selenide.Selenide.switchTo;

public final class BrowserSessionHelper {

    private BrowserSessionHelper() {
    }

    @Step("Reset browser page state")
    public static void resetPageState() {
        if (!WebDriverRunner.hasWebDriverStarted()) {
            return;
        }
        switchToDefaultContent();
        clearLocalStorage();
        clearSessionStorage();
        clearCookies();
        ViewportHelper.resetViewport();
    }

    @Step("Switch to default content")
    public static void switchToDefaultContent() {
        try {
            switchTo().defaultContent();
        } catch (RuntimeException ignored) {
            // not inside a frame
        }
    }

    @Step("Clear browser local storage")
    public static void clearLocalStorage() {
        localStorage().clear();
    }

    @Step("Clear browser session storage")
    public static void clearSessionStorage() {
        sessionStorage().clear();
    }

    @Step("Clear browser cookies")
    public static void clearCookies() {
        clearBrowserCookies();
    }
}
