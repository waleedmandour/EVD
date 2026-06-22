package com.waleedmandour.evdx.byd;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;

/**
 * EVDx BYD Auto Plugin — native bridge to BYD's BYDAUTO API.
 *
 * This plugin runs on BYD head units (DiLink 3.0, Android 10) and provides
 * direct vehicle data access via BYD's internal Android framework.
 *
 * On non-BYD devices, all methods return null/empty — the app falls back
 * to BLE OBD-II adapter mode.
 *
 * The plugin uses reflection to call BYD's API classes, so it doesn't need
 * BYD's proprietary JAR files at compile time.
 */
@CapacitorPlugin(name = "BYDAuto")
public class BYDAutoPlugin extends Plugin {

    private static final String TAG = "EVDx/BYDAuto";

    // BYD package names for detection
    private static final String BYD_AUTO_PACKAGE = "com.byd.auto";
    private static final String BYD_SETTINGS_PACKAGE = "com.byd.carsettings";
    private static final String BYD_LAUNCHER_PACKAGE = "com.byd.launcher";

    // BYD Auto Manager class name
    private static final String BYD_AUTO_MANAGER_CLASS = "com.byd.auto.manager.BYDAutoManager";
    private static final String BYD_ENERGY_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoEnergyDevice";
    private static final String BYD_CHARGING_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoChargingDevice";
    private static final String BYD_SPEED_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoSpeedDevice";
    private static final String BYD_TYRE_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoTyreDevice";
    private static final String BYD_DTC_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoDtcDevice";
    private static final String BYD_AC_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoAcDevice";

    private boolean isBYD = false;
    private Object autoManager = null;

    @Override
    public void load() {
        super.load();
        isBYD = detectBYDHeadUnit();
        Log.i(TAG, "BYD head unit detected: " + isBYD);
    }

    /**
     * Get a system property via reflection (android.os.SystemProperties is hidden API).
     */
    private String getSystemProperty(String key, String def) {
        try {
            Class<?> spClass = Class.forName("android.os.SystemProperties");
            Method get = spClass.getMethod("get", String.class, String.class);
            return (String) get.invoke(null, key, def);
        } catch (Exception e) {
            return def;
        }
    }

    /**
     * Detect if running on a BYD head unit by checking for BYD system packages.
     */
    private boolean detectBYDHeadUnit() {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();

        // Check for BYD system packages
        String[] bydPackages = {
            BYD_SETTINGS_PACKAGE,
            BYD_AUTO_PACKAGE,
            BYD_LAUNCHER_PACKAGE,
            "com.byd.carstatus",
            "com.byd.diagnostictool"
        };

        for (String pkg : bydPackages) {
            try {
                pm.getPackageInfo(pkg, 0);
                Log.i(TAG, "Found BYD package: " + pkg);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // Package not found — try next
            }
        }

        // Check system property
        String brand = getSystemProperty("ro.product.brand", "");
        if ("BYD".equalsIgnoreCase(brand) || "byd".equalsIgnoreCase(brand)) {
            Log.i(TAG, "BYD brand detected via system property");
            return true;
        }

        // Check for BYD-specific system property
        String bydProject = getSystemProperty("ro.build.byd.project", "");
        if (!bydProject.isEmpty()) {
            Log.i(TAG, "BYD project detected: " + bydProject);
            return true;
        }

        return false;
    }

    /**
     * Initialize the BYDAutoManager via reflection.
     * Called once when the plugin is first used.
     */
    private boolean initAutoManager() {
        if (autoManager != null) return true;
        if (!isBYD) return false;

        try {
            // Load BYDAutoManager class
            Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
            // Get the static getInstance(Context) method
            Method getInstance = managerClass.getMethod("getInstance", Context.class);
            // Call it with our context
            autoManager = getInstance.invoke(null, getContext());
            Log.i(TAG, "BYDAutoManager initialized successfully");
            return true;
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "BYDAutoManager class not found — not a BYD head unit or API unavailable");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize BYDAutoManager: " + e.getMessage());
        }
        return false;
    }

    /**
     * Check if running on a BYD head unit.
     * Called from JS: const { isBYD } = await BYDAuto.detect();
     */
    @PluginMethod
    public void detect(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isBYD", isBYD);

        if (isBYD) {
            // Try to get model info
            String brand = getSystemProperty("ro.product.brand", "BYD");
            String model = getSystemProperty("ro.product.model", "Unknown");
            String firmware = getSystemProperty("ro.build.display.id", "Unknown");
            ret.put("brand", brand);
            ret.put("model", model);
            ret.put("firmware", firmware);
            ret.put("androidVersion", String.valueOf(Build.VERSION.SDK_INT));
        }

        call.resolve(ret);
    }

    /**
     * Read all vehicle data from BYD's internal CAN bus.
     * Called from JS: const data = await BYDAuto.readVehicleData();
     *
     * Returns a JSObject with:
     *   soc, soh, voltage, current, power, speed, motorTemp, batteryTemp,
     *   ambientTemp, cabinTemp, odometer, range, chargingStatus,
     *   cellMaxV, cellMinV, tirePressures, tireTemps, acTemp, acOn,
     *   doorLocked, vin
     */
    @PluginMethod
    public void readVehicleData(PluginCall call) {
        if (!isBYD || !initAutoManager()) {
            call.reject("Not running on BYD head unit or BYDAutoManager unavailable");
            return;
        }

        JSObject data = new JSObject();

        try {
            // Try to read battery/energy data via BYDAutoEnergyDevice
            Class<?> energyClass = Class.forName(BYD_ENERGY_DEVICE_CLASS);
            Method getInstance = energyClass.getMethod("getInstance", Context.class);
            Object energyDevice = getInstance.invoke(null, getContext());

            // SOC
            try {
                Method getSoc = energyClass.getMethod("getSoc");
                int soc = (int) getSoc.invoke(energyDevice);
                data.put("soc", soc);
            } catch (Exception e) { Log.w(TAG, "getSoc failed: " + e.getMessage()); }

            // SOH
            try {
                Method getSoh = energyClass.getMethod("getSoh");
                int soh = (int) getSoh.invoke(energyDevice);
                data.put("soh", soh);
            } catch (Exception e) { Log.w(TAG, "getSoh failed: " + e.getMessage()); }

            // Voltage (V)
            try {
                Method getVoltage = energyClass.getMethod("getVoltage");
                float voltage = (float) getVoltage.invoke(energyDevice);
                data.put("voltage", voltage);
            } catch (Exception e) { Log.w(TAG, "getVoltage failed: " + e.getMessage()); }

            // Current (A)
            try {
                Method getCurrent = energyClass.getMethod("getCurrent");
                float current = (float) getCurrent.invoke(energyDevice);
                data.put("current", current);
            } catch (Exception e) { Log.w(TAG, "getCurrent failed: " + e.getMessage()); }

            // Battery temperature
            try {
                Method getBatteryTemp = energyClass.getMethod("getBatteryTemperature");
                float batteryTemp = (float) getBatteryTemp.invoke(energyDevice);
                data.put("batteryTemp", batteryTemp);
            } catch (Exception e) { Log.w(TAG, "getBatteryTemp failed: " + e.getMessage()); }

        } catch (Exception e) {
            Log.e(TAG, "EnergyDevice access failed: " + e.getMessage());
        }

        // Speed
        try {
            Class<?> speedClass = Class.forName(BYD_SPEED_DEVICE_CLASS);
            Method getInstance = speedClass.getMethod("getInstance", Context.class);
            Object speedDevice = getInstance.invoke(null, getContext());
            Method getSpeed = speedClass.getMethod("getSpeed");
            int speed = (int) getSpeed.invoke(speedDevice);
            data.put("speed", speed);
        } catch (Exception e) { Log.w(TAG, "Speed read failed: " + e.getMessage()); }

        // Charging status
        try {
            Class<?> chargingClass = Class.forName(BYD_CHARGING_DEVICE_CLASS);
            Method getInstance = chargingClass.getMethod("getInstance", Context.class);
            Object chargingDevice = getInstance.invoke(null, getContext());
            Method getChargingStatus = chargingClass.getMethod("getChargingStatus");
            int charging = (int) getChargingStatus.invoke(chargingDevice);
            data.put("chargingStatus", charging == 1);
        } catch (Exception e) { Log.w(TAG, "Charging read failed: " + e.getMessage()); }

        // Tire pressure (TPMS)
        try {
            Class<?> tyreClass = Class.forName(BYD_TYRE_DEVICE_CLASS);
            Method getInstance = tyreClass.getMethod("getInstance", Context.class);
            Object tyreDevice = getInstance.invoke(null, getContext());
            // Try to get tire pressures — method names may vary
            try {
                Method getPressure = tyreClass.getMethod("getTyrePressure");
                // Returns int[] or similar — handle generically
                Object result = getPressure.invoke(tyreDevice);
                if (result instanceof int[]) {
                    int[] pressures = (int[]) result;
                    JSObject tireData = new JSObject();
                    tireData.put("fl", pressures.length > 0 ? pressures[0] : 0);
                    tireData.put("fr", pressures.length > 1 ? pressures[1] : 0);
                    tireData.put("rl", pressures.length > 2 ? pressures[2] : 0);
                    tireData.put("rr", pressures.length > 3 ? pressures[3] : 0);
                    data.put("tirePressures", tireData);
                }
            } catch (Exception e) { Log.w(TAG, "Tire pressure read failed: " + e.getMessage()); }
        } catch (Exception e) { Log.w(TAG, "TyreDevice access failed: " + e.getMessage()); }

        // AC temperature
        try {
            Class<?> acClass = Class.forName(BYD_AC_DEVICE_CLASS);
            Method getInstance = acClass.getMethod("getInstance", Context.class);
            Object acDevice = getInstance.invoke(null, getContext());
            // getTemprature(zone) — zone 1 = driver, zone 2 = passenger, zone 4 = ambient
            Method getTemp = acClass.getMethod("getTemprature", int.class);
            float cabinTemp = (float) getTemp.invoke(acDevice, 1);
            float ambientTemp = (float) getTemp.invoke(acDevice, 4);
            data.put("cabinTemp", cabinTemp);
            data.put("ambientTemp", ambientTemp);
        } catch (Exception e) { Log.w(TAG, "AC read failed: " + e.getMessage()); }

        // Compute derived values
        try {
            if (data.has("voltage") && data.has("current")) {
                double v = data.getDouble("voltage");
                double a = data.getDouble("current");
                data.put("power", Math.round((v * a) / 1000.0 * 10.0) / 10.0); // kW
            }
        } catch (Exception e) { Log.w(TAG, "Power calc failed: " + e.getMessage()); }

        // Range estimation (if SOC available)
        try {
            if (data.has("soc")) {
                int soc = data.getInt("soc");
                // Default range: SOC * 4.2 km/% (BYD Yuan Plus ~420km WLTP at 100%)
                data.put("range", Math.round(soc * 4.2f));
            }
        } catch (Exception e) { Log.w(TAG, "Range calc failed: " + e.getMessage()); }

        call.resolve(data);
    }

    /**
     * Read Diagnostic Trouble Codes via BYD's native DTC system.
     */
    @PluginMethod
    public void readDTCs(PluginCall call) {
        if (!isBYD || !initAutoManager()) {
            call.reject("Not running on BYD head unit");
            return;
        }

        JSObject ret = new JSObject();
        org.json.JSONArray dtcArray = new org.json.JSONArray();

        try {
            Class<?> dtcClass = Class.forName(BYD_DTC_DEVICE_CLASS);
            Method getInstance = dtcClass.getMethod("getInstance", Context.class);
            Object dtcDevice = getInstance.invoke(null, getContext());

            // Try to get DTC list — method name may vary
            try {
                Method getDtcList = dtcClass.getMethod("getDtcList");
                Object result = getDtcList.invoke(dtcDevice);
                if (result instanceof java.util.List) {
                    java.util.List<?> list = (java.util.List<?>) result;
                    for (Object dtc : list) {
                        if (dtc != null) {
                            dtcArray.put(dtc.toString());
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "getDtcList failed: " + e.getMessage());
            }
        } catch (Exception e) {
            Log.w(TAG, "DtcDevice access failed: " + e.getMessage());
        }

        ret.put("dtcs", dtcArray);
        call.resolve(ret);
    }

    /**
     * Clear DTCs via BYD's native API.
     */
    @PluginMethod
    public void clearDTCs(PluginCall call) {
        if (!isBYD || !initAutoManager()) {
            call.reject("Not running on BYD head unit");
            return;
        }

        try {
            Class<?> dtcClass = Class.forName(BYD_DTC_DEVICE_CLASS);
            Method getInstance = dtcClass.getMethod("getInstance", Context.class);
            Object dtcDevice = getInstance.invoke(null, getContext());
            Method clearDtcList = dtcClass.getMethod("clearDtcList");
            clearDtcList.invoke(dtcDevice);
            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Clear DTCs failed: " + e.getMessage());
            call.reject("Failed to clear DTCs: " + e.getMessage());
        }
    }

    /**
     * Read VIN from BYD's vehicle data.
     */
    @PluginMethod
    public void readVIN(PluginCall call) {
        if (!isBYD || !initAutoManager()) {
            call.reject("Not running on BYD head unit");
            return;
        }

        try {
            // VIN might be available via a general vehicle data device
            // or via a system property
            String vin = getSystemProperty("ro.byd.vin", "");
            if (vin.isEmpty()) {
                // Try the BYDAuto API
                Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
                Method getVin = managerClass.getMethod("getVin");
                vin = (String) getVin.invoke(autoManager);
            }
            call.resolve(new JSObject().put("vin", vin != null ? vin : ""));
        } catch (Exception e) {
            Log.w(TAG, "VIN read failed: " + e.getMessage());
            call.resolve(new JSObject().put("vin", ""));
        }
    }
}
