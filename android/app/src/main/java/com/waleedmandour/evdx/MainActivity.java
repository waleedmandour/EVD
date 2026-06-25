package com.waleedmandour.evdx;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.waleedmandour.evdx.byd.BYDAutoPlugin;

/**
 * MainActivity (Fix #2: SplashScreen API activation).
 *
 * PREVIOUS BUG: build.gradle included the androidx.core:core-splashscreen
 * dependency, but MainActivity never called SplashScreen.installSplashScreen(this).
 * Without this call, the AndroidX SplashScreen API was on the classpath but
 * inactive. The splash-to-WebView transition was uncontrolled, causing a
 * black flash on BYD DiLink 3.0 (Android 10).
 *
 * FIX: Call SplashScreen.installSplashScreen(this) BEFORE super.onCreate().
 * This installs the splash screen handler that coordinates the transition
 * from the launch theme's windowBackground to the live WebView. The
 * setKeepOnScreenCondition(() -> false) lets the splash dismiss as soon as
 * the first frame is drawn (standard Android 12+ behavior, also works on
 * Android 10 via the compat library).
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register BYD Auto plugin before super.onCreate
        registerPlugin(BYDAutoPlugin.class);

        // Install the AndroidX Splash Screen API BEFORE super.onCreate so
        // the splash holds during WebView initialization and Capacitor bridge
        // setup. This prevents the black flash on BYD DiLink 3.0.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        // Keep the splash on-screen until the WebView signals readiness.
        // Returning false means "dismiss as soon as the first frame is drawn".
        splashScreen.setKeepOnScreenCondition(() -> false);

        super.onCreate(savedInstanceState);
    }
}
