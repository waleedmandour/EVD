package com.waleedmandour.evdx;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;

/**
 * SplashActivity (Fix A: black splash screen).
 *
 * Previously, the app used the launcher theme's windowBackground as the only
 * splash. That windowBackground was @drawable/splash_screen, which used
 * @color/colorPrimaryDark (#0D1117, near-black). On BYD DiLink 3.0 (forced
 * dark mode, Android 10) the user saw a fully black window for the ~5-10
 * seconds it takes Capacitor to hydrate the WebView, leading to "black
 * screen" / "crash" reports.
 *
 * This activity:
 *   1. Sets the content view to R.layout.activity_splash, which has a
 *      bright WHITE background and a centered dark logo. This guarantees
 *      the splash is visible regardless of system dark mode.
 *   2. Explicitly clears FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS issues by
 *      setting the window background to white (defense in depth — even if
 *      the theme is somehow overridden, the window is still bright).
 *   3. Holds the splash visible for at least 1500 ms (per the spec) so the
 *      user actually sees it instead of a sub-100ms flash.
 *   4. Then launches MainActivity and calls finish() so the splash is
 *      removed from the back stack.
 *
 * No logic hides the content view or sets a dark background — that was a
 * bug in some implementations and is explicitly avoided here.
 */
public class SplashActivity extends AppCompatActivity {

    private static final long MIN_SPLASH_DURATION_MS = 1500L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force the window background to bright white. Even though the theme
        // already sets windowBackground=@drawable/splash_screen, some OEMs
        // (notably BYD DiLink 3.0) override the window background in dark
        // mode. Setting it programmatically here is a reliable defense.
        getWindow().setBackgroundDrawableResource(R.color.splash_background);
        // Keep the screen on while the splash is visible so it doesn't dim.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_splash);

        // Ensure the logo is visible (defense in depth against any global
        // theme override that might set visibility=gone).
        View logo = findViewById(R.id.splash_logo);
        if (logo != null) {
            logo.setVisibility(View.VISIBLE);
        }

        // Navigate to MainActivity after at least MIN_SPLASH_DURATION_MS.
        new Handler(Looper.getMainLooper()).postDelayed(this::launchMainActivity,
                MIN_SPLASH_DURATION_MS);
    }

    private void launchMainActivity() {
        Intent intent = new Intent(this, MainActivity.class);
        // CLEAR_TOP | SINGLE_TOP so we don't stack multiple MainActivity instances
        // if the user re-opens the app from the launcher while the splash is showing.
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        // Don't animate the transition — a fade would briefly show black.
        overridePendingTransition(0, 0);
        finish();
    }
}
