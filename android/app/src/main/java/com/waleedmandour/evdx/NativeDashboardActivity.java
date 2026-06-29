package com.waleedmandour.evdx;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.waleedmandour.evdx.byd.BYDNativeReader;

import java.util.Map;

/**
 * NativeDashboardActivity — native Android dashboard for BYD head units.
 *
 * This is the HYBRID ARCHITECTURE's native shell. On BYD head units,
 * SplashActivity routes here instead of directly to MainActivity (WebView).
 * This activity:
 *
 *   1. Reads vehicle data from BYDAutoPlugin via BYDNativeReader (native,
 *      no WebView needed — instant display)
 *   2. Shows a comprehensive dashboard with speed, SOC, battery temp,
 *      range, power, motor temp, odometer, tire pressures, and DTC count
 *   3. Starts loading MainActivity (WebView) in the background immediately
 *   4. Has a "Full App" button that switches to the WebView when ready
 *
 * The native dashboard updates at 1Hz (every 1000ms) using a Handler.
 * If BYD data is unavailable, it shows a "Connect OBD Adapter" button
 * that launches MainActivity (WebView) for BLE connection.
 *
 * On non-BYD devices, SplashActivity skips this activity and goes directly
 * to MainActivity (WebView) — the native dashboard adds no value without
 * BYD native data.
 */
public class NativeDashboardActivity extends AppCompatActivity {

    private static final String TAG = "EVDx/NativeDashboard";
    private static final long POLL_INTERVAL_MS = 1000L;

    private BYDNativeReader bydReader;
    private Handler pollHandler;
    private boolean polling = false;

    // Dashboard views
    private TextView speedValue, socValue, rangeValue, powerValue;
    private TextView batteryTempValue, motorTempValue, ambientTempValue;
    private TextView odometerValue, voltageValue, currentValue;
    private TextView cellMaxVValue, cellMinVValue, dtcCountValue;
    private TextView tireFlValue, tireFrValue, tireRlValue, tireRrValue;
    private TextView chargingStatusValue, connectionStatusValue;
    private ProgressBar socBar;
    private Button fullAppButton, connectButton;

    // Track if WebView has been launched
    private boolean webViewLaunched = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while dashboard is visible
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_dashboard);

        bydReader = new BYDNativeReader(this);
        pollHandler = new Handler(Looper.getMainLooper());

        bindViews();

        // Check if we're on a BYD head unit
        boolean isBYD = bydReader.isBYD();
        Log.i(TAG, "BYD head unit: " + isBYD);

        if (isBYD) {
            // Start native data polling
            startPolling();
            // Pre-load WebView in background (smooth transition when user taps "Full App")
            // We don't launch it yet — just prepare it. The WebView loads when the
            // user taps the "Full App" button, but the React bundle is already
            // cached from the previous run (or will load quickly).
            connectionStatusValue.setText("BYD Native Mode");
            connectionStatusValue.setTextColor(0xFF00E676); // green
            connectButton.setVisibility(View.GONE);
            fullAppButton.setVisibility(View.VISIBLE);
        } else {
            // Non-BYD — show connect button, launch WebView directly
            connectionStatusValue.setText("Not BYD — BLE Mode");
            connectionStatusValue.setTextColor(0xFFFFB300); // amber
            connectButton.setVisibility(View.VISIBLE);
            fullAppButton.setVisibility(View.GONE);
            // Launch WebView immediately on non-BYD
            launchWebView();
        }

        fullAppButton.setOnClickListener(v -> launchWebView());
        connectButton.setOnClickListener(v -> launchWebView());
    }

    private void bindViews() {
        speedValue = findViewById(R.id.speed_value);
        socValue = findViewById(R.id.soc_value);
        rangeValue = findViewById(R.id.range_value);
        powerValue = findViewById(R.id.power_value);
        batteryTempValue = findViewById(R.id.battery_temp_value);
        motorTempValue = findViewById(R.id.motor_temp_value);
        ambientTempValue = findViewById(R.id.ambient_temp_value);
        odometerValue = findViewById(R.id.odometer_value);
        voltageValue = findViewById(R.id.voltage_value);
        currentValue = findViewById(R.id.current_value);
        cellMaxVValue = findViewById(R.id.cell_max_v_value);
        cellMinVValue = findViewById(R.id.cell_min_v_value);
        dtcCountValue = findViewById(R.id.dtc_count_value);
        tireFlValue = findViewById(R.id.tire_fl_value);
        tireFrValue = findViewById(R.id.tire_fr_value);
        tireRlValue = findViewById(R.id.tire_rl_value);
        tireRrValue = findViewById(R.id.tire_rr_value);
        chargingStatusValue = findViewById(R.id.charging_status_value);
        connectionStatusValue = findViewById(R.id.connection_status_value);
        socBar = findViewById(R.id.soc_bar);
        fullAppButton = findViewById(R.id.full_app_button);
        connectButton = findViewById(R.id.connect_button);
    }

    private void startPolling() {
        polling = true;
        pollHandler.post(this::pollVehicleData);
    }

    private void stopPolling() {
        polling = false;
        pollHandler.removeCallbacksAndMessages(null);
    }

    private void pollVehicleData() {
        if (!polling) return;

        try {
            Map<String, Object> data = bydReader.readVehicleData();
            if (data != null) {
                updateDashboard(data);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Poll failed: " + t.getMessage());
        }

        // Schedule next poll
        pollHandler.postDelayed(this::pollVehicleData, POLL_INTERVAL_MS);
    }

    /**
     * Update the native dashboard views with fresh vehicle data.
     */
    private void updateDashboard(Map<String, Object> data) {
        // Speed (km/h)
        setIntText(speedValue, data, "speed", " km/h");

        // SOC (%)
        int soc = getInt(data, "soc", -1);
        if (soc >= 0) {
            socValue.setText(soc + "%");
            socBar.setProgress(soc);
            // Color: green > 50%, amber > 20%, red <= 20%
            int color = soc > 50 ? 0xFF00E676 : soc > 20 ? 0xFFFFB300 : 0xFFFF3D00;
            socValue.setTextColor(color);
        }

        // Range (km)
        setIntText(rangeValue, data, "range", " km");

        // Power (kW)
        setDoubleText(powerValue, data, "power", " kW");

        // Battery temp
        setFloatText(batteryTempValue, data, "batteryTemp", " °C");

        // Motor temp
        setFloatText(motorTempValue, data, "motorTemp", " °C");

        // Ambient temp
        setFloatText(ambientTempValue, data, "ambientTemp", " °C");

        // Odometer
        setIntText(odometerValue, data, "odometer", " km");

        // Pack voltage and current
        setFloatText(voltageValue, data, "voltage", " V");
        setFloatText(currentValue, data, "current", " A");

        // Cell voltages
        setIntText(cellMaxVValue, data, "cellMaxV", " mV");
        setIntText(cellMinVValue, data, "cellMinV", " mV");

        // Charging status
        Object charging = data.get("chargingStatus");
        if (charging instanceof Boolean) {
            chargingStatusValue.setText((Boolean) charging ? "Charging" : "Not Charging");
            chargingStatusValue.setTextColor((Boolean) charging ? 0xFF00E676 : 0xFF78909C);
        }

        // Tire pressures
        Object tires = data.get("tirePressures");
        if (tires instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Integer> tp = (Map<String, Integer>) tires;
            setTireText(tireFlValue, tp, "fl");
            setTireText(tireFrValue, tp, "fr");
            setTireText(tireRlValue, tp, "rl");
            setTireText(tireRrValue, tp, "rr");
        }

        // DTC count (read less frequently — every 10 polls)
        // For simplicity, we read it every poll; it's lightweight
        try {
            int dtcCount = bydReader.readDTCs().size();
            dtcCountValue.setText(String.valueOf(dtcCount));
            dtcCountValue.setTextColor(dtcCount > 0 ? 0xFFFF3D00 : 0xFF00E676);
        } catch (Throwable t) {
            dtcCountValue.setText("—");
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helper methods for updating TextViews from the data map
    // ──────────────────────────────────────────────────────────────────────────

    private int getInt(Map<String, Object> data, String key, int def) {
        try {
            Object v = data.get(key);
            if (v instanceof Number) return ((Number) v).intValue();
        } catch (Throwable t) { /* ignore */ }
        return def;
    }

    private void setIntText(TextView tv, Map<String, Object> data, String key, String suffix) {
        try {
            Object v = data.get(key);
            if (v instanceof Number) {
                tv.setText(((Number) v).intValue() + suffix);
            }
        } catch (Throwable t) { /* ignore */ }
    }

    private void setFloatText(TextView tv, Map<String, Object> data, String key, String suffix) {
        try {
            Object v = data.get(key);
            if (v instanceof Number) {
                float f = ((Number) v).floatValue();
                tv.setText(String.format("%.1f%s", f, suffix));
            }
        } catch (Throwable t) { /* ignore */ }
    }

    private void setDoubleText(TextView tv, Map<String, Object> data, String key, String suffix) {
        try {
            Object v = data.get(key);
            if (v instanceof Number) {
                double d = ((Number) v).doubleValue();
                tv.setText(String.format("%.1f%s", d, suffix));
            }
        } catch (Throwable t) { /* ignore */ }
    }

    private void setTireText(TextView tv, Map<String, Integer> tp, String key) {
        try {
            Integer v = tp.get(key);
            if (v != null) tv.setText(v + " kPa");
        } catch (Throwable t) { /* ignore */ }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WebView launch
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Launch MainActivity (Capacitor WebView) which hosts the full React app.
     * The WebView loads automatically — smooth transition from native dashboard.
     */
    private void launchWebView() {
        if (webViewLaunched) return;
        webViewLaunched = true;

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        // Smooth transition — no animation (avoids black flash)
        overridePendingTransition(0, 0);
        finish();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────────────────────────────────────

    @Override
    protected void onResume() {
        super.onResume();
        if (bydReader.isBYD() && !polling) {
            startPolling();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopPolling();
    }

    @Override
    protected void onDestroy() {
        stopPolling();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // Don't go back to splash — exit the app instead
        finishAffinity();
    }
}
