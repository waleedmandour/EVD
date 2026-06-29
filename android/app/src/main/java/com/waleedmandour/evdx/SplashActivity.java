package com.waleedmandour.evdx;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;

import com.waleedmandour.evdx.byd.BYDNativeReader;

/**
 * SplashActivity — the launcher activity.
 *
 * Shows a bright white splash with the EVDx logo for at least 1500ms,
 * then routes to the appropriate next activity:
 *
 *   - On BYD head units: → NativeDashboardActivity (native dashboard with
 *     instant vehicle data, no WebView needed). The WebView loads in the
 *     background and is available via the "Full App" button.
 *
 *   - On non-BYD devices: → MainActivity (Capacitor WebView) directly.
 *     The native dashboard adds no value without BYD native data.
 *
 * This routing is the core of the Hybrid Architecture:
 *   BYD:     Splash → NativeDashboard → (background WebView) → Full App
 *   Phone:   Splash → MainActivity (WebView)
 */
public class SplashActivity extends AppCompatActivity {

    private static final long MIN_SPLASH_DURATION_MS = 1500L;
    private static final String TAG = "EVDx/Splash";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force the window background to bright white.
        getWindow().setBackgroundDrawableResource(R.color.splash_background);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_splash);

        // Ensure the logo is visible
        View logo = findViewById(R.id.splash_logo);
        if (logo != null) {
            logo.setVisibility(View.VISIBLE);
        }

        // Navigate after at least MIN_SPLASH_DURATION_MS
        new Handler(Looper.getMainLooper()).postDelayed(this::launchNextActivity,
                MIN_SPLASH_DURATION_MS);
    }

    /**
     * Route to the appropriate activity based on BYD detection.
     * On BYD: go to NativeDashboardActivity (hybrid native shell).
     * On non-BYD: go to MainActivity (WebView) directly.
     */
    private void launchNextActivity() {
        boolean isBYD = false;
        try {
            BYDNativeReader reader = new BYDNativeReader(this);
            isBYD = reader.isBYD();
        } catch (Throwable t) {
            Log.w(TAG, "BYD detection failed, defaulting to WebView mode", t);
            isBYD = false;
        }

        Log.i(TAG, "BYD detected: " + isBYD + " — routing to " +
              (isBYD ? "NativeDashboardActivity" : "MainActivity (WebView)"));

        Class<?> nextActivity = isBYD ? NativeDashboardActivity.class : MainActivity.class;
        Intent intent = new Intent(this, nextActivity);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        overridePendingTransition(0, 0);
        finish();
    }
}
