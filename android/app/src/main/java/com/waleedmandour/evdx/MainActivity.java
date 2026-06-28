package com.waleedmandour.evdx;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.waleedmandour.evdx.byd.BYDAutoPlugin;

/**
 * MainActivity — Capacitor WebView host with splash screen coordination.
 *
 * The splash screen lifecycle is:
 *   1. SplashActivity shows a white splash + EVDx logo for 1500ms
 *   2. SplashActivity launches MainActivity
 *   3. AndroidX SplashScreen (installSplashScreen) shows the windowBackground
 *      drawable briefly, then dismisses when the first frame draws
 *   4. Capacitor SplashScreen plugin takes over, showing the splash_screen
 *      drawable until either:
 *      (a) React calls SplashScreen.hide() after first render (normal)
 *      (b) 10 seconds elapse (safety timeout — JS failed to load)
 *   5. WebView background is set to #0D1117 (dark brand color) so even
 *      during the gap between splash dismiss and first React paint, the
 *      user sees the dark brand color instead of black.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "EVDx/MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register BYD Auto plugin before super.onCreate
        registerPlugin(BYDAutoPlugin.class);

        // Install the AndroidX Splash Screen API BEFORE super.onCreate so
        // the splash holds during WebView initialization.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        // Dismiss the AndroidX splash as soon as the first frame draws.
        // The Capacitor SplashScreen plugin takes over after this.
        splashScreen.setKeepOnScreenCondition(() -> false);

        super.onCreate(savedInstanceState);

        // Phase 1.3: Set WebView background to match app theme (#0D1117 dark).
        // This prevents a black flash during the gap between the native splash
        // dismiss and the first React paint. The WebView's background is visible
        // through any transparent areas of the HTML before CSS fully loads.
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().setBackgroundColor(Color.parseColor("#0D1117"));
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to set WebView background color", e);
        }
    }
}
