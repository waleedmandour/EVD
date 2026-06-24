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
 *
 * DETECTION (in load(), cached for the app lifetime):
 *   1. System property ro.byd.model — set on all BYD head units
 *   2. System property ro.build.byd.project — alternate BYD indicator
 *   3. System property ro.product.brand == "BYD"
 *   4. Any of the 10 com.byd.auto.* system packages installed
 *      (ac, navigation, media, settings, phone, launcher, climate,
 *       vehicleinfo, energy, camera) — confirmed package list from the
 *       binti2 reference repo (waleedmandour/binti2).
 *
 * Previous versions of this plugin looked for the WRONG package names
 * (com.byd.carsettings, com.byd.carstatus, com.byd.diagnostictool) which
 * do not exist on real BYD head units — so detection always failed and
 * the native data path was never activated.
 */
@CapacitorPlugin(name = "BYDAuto")
public class BYDAutoPlugin extends Plugin {

    private static final String TAG = "EVDx/BYDAuto";

    // ──────────────────────────────────────────────────────────────────────────
    // Confirmed BYD DiLink 3.0 system packages (from binti2 reference repo).
    // ──────────────────────────────────────────────────────────────────────────
    private static final String[] BYD_SYSTEM_PACKAGES = {
        "com.byd.auto.ac",
        "com.byd.auto.navigation",
        "com.byd.auto.media",
        "com.byd.auto.settings",
        "com.byd.auto.phone",
        "com.byd.auto.launcher",
        "com.byd.auto.climate",
        "com.byd.auto.vehicleinfo",
        "com.byd.auto.energy",
        "com.byd.auto.camera"
    };

    // BYD Auto Manager class name (internal framework, not in AOSP)
    private static final String BYD_AUTO_MANAGER_CLASS     = "com.byd.auto.manager.BYDAutoManager";
    private static final String BYD_ENERGY_DEVICE_CLASS    = "com.byd.auto.manager.BYDAutoEnergyDevice";
    private static final String BYD_CHARGING_DEVICE_CLASS  = "com.byd.auto.manager.BYDAutoChargingDevice";
    private static final String BYD_SPEED_DEVICE_CLASS     = "com.byd.auto.manager.BYDAutoSpeedDevice";
    private static final String BYD_TYRE_DEVICE_CLASS      = "com.byd.auto.manager.BYDAutoTyreDevice";
    private static final String BYD_DTC_DEVICE_CLASS       = "com.byd.auto.manager.BYDAutoDtcDevice";
    private static final String BYD_AC_DEVICE_CLASS        = "com.byd.auto.manager.BYDAutoAcDevice";
    // Vehicle information device — provides odometer, VIN, range
    private static final String BYD_VEHICLE_DEVICE_CLASS   = "com.byd.auto.manager.BYDAutoVehicleDevice";

    private boolean isBYD = false;
    private Object autoManager = null;

    @Override
    public void load() {
        super.load();
        try {
            isBYD = detectBYDHeadUnit();
        } catch (Throwable t) {
            // Defensive: never let plugin load() crash the app — the WebView
            // would never start and the user would see a permanent black screen.
            Log.e(TAG, "BYD detection threw, defaulting to non-BYD mode", t);
            isBYD = false;
        }
        Log.i(TAG, "BYD head unit detected: " + isBYD);
    }

    /**
     * Read a system property via reflection (android.os.SystemProperties is hidden API).
     */
    private String getSystemProperty(String key, String def) {
        try {
            Class<?> spClass = Class.forName("android.os.SystemProperties");
            Method get = spClass.getMethod("get", String.class, String.class);
            Object result = get.invoke(null, key, def);
            return result != null ? (String) result : def;
        } catch (Throwable t) {
            return def;
        }
    }

    /**
     * Detect if running on a BYD head unit.
     *
     * Checks (in order, returns true on first hit):
     *   1. ro.byd.model system property (preferred — set on all DiLink 3.0+)
     *   2. ro.build.byd.project system property (alternate)
     *   3. ro.product.brand equals "BYD" (case-insensitive)
     *   4. Any of the 10 com.byd.auto.* packages installed
     *
     * All checks are individually try/caught — a single failing check never
     * prevents the others from running.
     */
    private boolean detectBYDHeadUnit() {
        Context context = getContext();
        if (context == null) return false;
        PackageManager pm = context.getPackageManager();

        // 1. ro.byd.model — the canonical BYD model property
        String bydModel = getSystemProperty("ro.byd.model", "");
        if (!bydModel.isEmpty()) {
            Log.i(TAG, "BYD detected via ro.byd.model = " + bydModel);
            return true;
        }

        // 2. ro.build.byd.project — alternate
        String bydProject = getSystemProperty("ro.build.byd.project", "");
        if (!bydProject.isEmpty()) {
            Log.i(TAG, "BYD detected via ro.build.byd.project = " + bydProject);
            return true;
        }

        // 3. ro.product.brand == "BYD"
        String brand = getSystemProperty("ro.product.brand", "");
        if ("BYD".equalsIgnoreCase(brand)) {
            Log.i(TAG, "BYD detected via ro.product.brand = " + brand);
            return true;
        }

        // 4. BYD system packages
        for (String pkg : BYD_SYSTEM_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, 0);
                Log.i(TAG, "BYD detected via installed package: " + pkg);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // not installed — try next
            } catch (Throwable t) {
                Log.w(TAG, "Package check threw for " + pkg + ": " + t.getMessage());
            }
        }

        return false;
    }

    /**
     * Initialize the BYDAutoManager via reflection.
     * Called lazily on first readVehicleData/readDTCs/clearDTCs/readVIN.
     * Returns false if not a BYD head unit or if the BYDAUTO framework is
     * not available (e.g. locked-down firmware that hides the manager class).
     */
    private boolean initAutoManager() {
        if (autoManager != null) return true;
        if (!isBYD) return false;

        try {
            Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
            Method getInstance = managerClass.getMethod("getInstance", Context.class);
            autoManager = getInstance.invoke(null, getContext());
            Log.i(TAG, "BYDAutoManager initialized successfully");
            return true;
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "BYDAutoManager class not found — locked-down BYD firmware?");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to initialize BYDAutoManager: " + t.getMessage());
        }
        return false;
    }

    /**
     * Check if running on a BYD head unit.
     * JS: const { isBYD, brand, model, firmware, androidVersion } = await BYDAuto.detect();
     */
    @PluginMethod
    public void detect(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isBYD", isBYD);

        if (isBYD) {
            String brand    = getSystemProperty("ro.product.brand", "BYD");
            String model    = getSystemProperty("ro.product.model", "Unknown");
            String bydModel = getSystemProperty("ro.byd.model", "");
            String firmware = getSystemProperty("ro.build.display.id", "Unknown");
            ret.put("brand", brand);
            ret.put("model", bydModel.isEmpty() ? model : bydModel);
            ret.put("firmware", firmware);
            ret.put("androidVersion", String.valueOf(Build.VERSION.SDK_INT));
        }

        call.resolve(ret);
    }

    /**
     * Read all vehicle data from BYD's internal CAN bus.
     * JS: const data = await BYDAuto.readVehicleData();
     *
     * Returns a JSObject with soc, soh, voltage, current, power, speed,
     * motorTemp, batteryTemp, ambientTemp, cabinTemp, odometer, range,
     * chargingStatus, cellMaxV, cellMinV, tirePressures, tireTemps,
     * acTemp, acOn, doorLocked, vin.
     *
     * Every field is read inside its own try/catch — a single failing
     * getter never prevents the rest from being returned.
     */
    @PluginMethod
    public void readVehicleData(PluginCall call) {
        if (!isBYD || !initAutoManager()) {
            // Graceful reject — JS side falls back to BLE mode.
            call.reject("Not running on BYD head unit or BYDAutoManager unavailable");
            return;
        }

        JSObject data = new JSObject();

        // ─── Battery / Energy device ────────────────────────────────────────────
        try {
            Class<?> energyClass = Class.forName(BYD_ENERGY_DEVICE_CLASS);
            Method getInstance = energyClass.getMethod("getInstance", Context.class);
            Object energyDevice = getInstance.invoke(null, getContext());

            tryReflectInt   (energyClass, energyDevice, "getSoc",              data, "soc");
            tryReflectInt   (energyClass, energyDevice, "getSoh",              data, "soh");
            tryReflectFloat (energyClass, energyDevice, "getVoltage",          data, "voltage");
            tryReflectFloat (energyClass, energyDevice, "getCurrent",          data, "current");
            tryReflectFloat (energyClass, energyDevice, "getBatteryTemperature", data, "batteryTemp");
            // Cell voltages for battery balancing view
            tryReflectInt   (energyClass, energyDevice, "getMaxCellVoltage",   data, "cellMaxV");
            tryReflectInt   (energyClass, energyDevice, "getMinCellVoltage",   data, "cellMinV");
        } catch (Throwable t) {
            Log.w(TAG, "EnergyDevice access failed: " + t.getMessage());
        }

        // ─── Speed device (vehicle speed + motor RPM + motor temperature) ────────
        try {
            Class<?> speedClass = Class.forName(BYD_SPEED_DEVICE_CLASS);
            Method getInstance = speedClass.getMethod("getInstance", Context.class);
            Object speedDevice = getInstance.invoke(null, getContext());
            tryReflectInt(speedClass, speedDevice, "getSpeed", data, "speed");
            // Motor RPM (some firmware versions expose this on SpeedDevice)
            tryReflectInt(speedClass, speedDevice, "getMotorSpeed", data, "motorRPM");
            // Motor temperature
            tryReflectFloat(speedClass, speedDevice, "getMotorTemperature", data, "motorTemp");
        } catch (Throwable t) {
            Log.w(TAG, "Speed read failed: " + t.getMessage());
        }

        // ─── Charging device ────────────────────────────────────────────────────
        try {
            Class<?> chargingClass = Class.forName(BYD_CHARGING_DEVICE_CLASS);
            Method getInstance = chargingClass.getMethod("getInstance", Context.class);
            Object chargingDevice = getInstance.invoke(null, getContext());
            try {
                Method m = chargingClass.getMethod("getChargingStatus");
                Object r = m.invoke(chargingDevice);
                if (r instanceof Integer) data.put("chargingStatus", ((Integer) r) == 1);
                else if (r instanceof Boolean) data.put("chargingStatus", r);
            } catch (Throwable t) {
                Log.w(TAG, "getChargingStatus failed: " + t.getMessage());
            }
        } catch (Throwable t) {
            Log.w(TAG, "ChargingDevice access failed: " + t.getMessage());
        }

        // ─── Tyre / TPMS device ──────────────────────────────────────────────────
        try {
            Class<?> tyreClass = Class.forName(BYD_TYRE_DEVICE_CLASS);
            Method getInstance = tyreClass.getMethod("getInstance", Context.class);
            Object tyreDevice = getInstance.invoke(null, getContext());
            try {
                Method m = tyreClass.getMethod("getTyrePressure");
                Object r = m.invoke(tyreDevice);
                if (r instanceof int[]) {
                    int[] p = (int[]) r;
                    JSObject td = new JSObject();
                    td.put("fl", p.length > 0 ? p[0] : 0);
                    td.put("fr", p.length > 1 ? p[1] : 0);
                    td.put("rl", p.length > 2 ? p[2] : 0);
                    td.put("rr", p.length > 3 ? p[3] : 0);
                    data.put("tirePressures", td);
                }
            } catch (Throwable t) {
                Log.w(TAG, "getTyrePressure failed: " + t.getMessage());
            }
        } catch (Throwable t) {
            Log.w(TAG, "TyreDevice access failed: " + t.getMessage());
        }

        // ─── AC device (cabin + ambient temperature) ────────────────────────────
        // BYD firmware versions disagree on the method name:
        //   - Older DiLink 3.0:  getTemprature(int zone)  (BYD's typo)
        //   - Newer DiLink 3.0:  getTemperature(int zone) (corrected spelling)
        // We try both, with the typo first since older firmware is more common
        // in the wild. Zone 1 = driver, zone 4 = ambient.
        try {
            Class<?> acClass = Class.forName(BYD_AC_DEVICE_CLASS);
            Method getInstance = acClass.getMethod("getInstance", Context.class);
            Object acDevice = getInstance.invoke(null, getContext());

            boolean acRead = false;
            // Attempt 1: getTemprature (BYD legacy typo)
            try {
                Method m = acClass.getMethod("getTemprature", int.class);
                Object cabin = m.invoke(acDevice, 1);
                Object ambient = m.invoke(acDevice, 4);
                if (cabin instanceof Float) data.put("cabinTemp", (Float) cabin);
                if (ambient instanceof Float) data.put("ambientTemp", (Float) ambient);
                acRead = true;
            } catch (NoSuchMethodException nsme) {
                // Fall through to attempt 2
            } catch (Throwable t) {
                Log.w(TAG, "getTemprature failed: " + t.getMessage());
            }
            // Attempt 2: getTemperature (corrected spelling on newer firmware)
            if (!acRead) {
                try {
                    Method m = acClass.getMethod("getTemperature", int.class);
                    Object cabin = m.invoke(acDevice, 1);
                    Object ambient = m.invoke(acDevice, 4);
                    if (cabin instanceof Float) data.put("cabinTemp", (Float) cabin);
                    if (ambient instanceof Float) data.put("ambientTemp", (Float) ambient);
                } catch (Throwable t) {
                    Log.w(TAG, "getTemperature fallback failed: " + t.getMessage());
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "AcDevice access failed: " + t.getMessage());
        }

        // ─── Vehicle device (odometer + remaining range) ──────────────────────────
        // BYDAutoVehicleDevice exposes total odometer and the BMS-estimated
        // remaining range. We try this BEFORE the derived range calculation
        // below so a real reading from the car takes precedence over the
        // SOC * 4.2 fallback.
        try {
            Class<?> vehicleClass = Class.forName(BYD_VEHICLE_DEVICE_CLASS);
            Method getInstance = vehicleClass.getMethod("getInstance", Context.class);
            Object vehicleDevice = getInstance.invoke(null, getContext());
            // Odometer in km (int)
            tryReflectInt(vehicleClass, vehicleDevice, "getOdometer", data, "odometer");
            // Remaining range in km (int)
            tryReflectInt(vehicleClass, vehicleDevice, "getRemainingRange", data, "range");
        } catch (Throwable t) {
            Log.w(TAG, "VehicleDevice access failed: " + t.getMessage());
        }

        // ─── Derived: power (kW) ─────────────────────────────────────────────────
        try {
            if (data.has("voltage") && data.has("current")) {
                double v = data.getDouble("voltage");
                double a = data.getDouble("current");
                data.put("power", Math.round((v * a) / 1000.0 * 10.0) / 10.0);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Power calc failed: " + t.getMessage());
        }

        // ─── Derived: range (km) — only as a fallback when BYDAutoVehicleDevice
        // didn't already provide a real getRemainingRange() value. BYD Yuan Plus
        // ~420 km WLTP at 100% SOC.
        try {
            if (!data.has("range") && data.has("soc")) {
                int soc = data.getInt("soc");
                data.put("range", Math.round(soc * 4.2f));
            }
        } catch (Throwable t) {
            Log.w(TAG, "Range calc failed: " + t.getMessage());
        }

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

            try {
                Method getDtcList = dtcClass.getMethod("getDtcList");
                Object result = getDtcList.invoke(dtcDevice);
                if (result instanceof java.util.List) {
                    for (Object dtc : (java.util.List<?>) result) {
                        if (dtc != null) dtcArray.put(dtc.toString());
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "getDtcList failed: " + t.getMessage());
            }
        } catch (Throwable t) {
            Log.w(TAG, "DtcDevice access failed: " + t.getMessage());
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
        } catch (Throwable t) {
            Log.e(TAG, "Clear DTCs failed: " + t.getMessage());
            call.reject("Failed to clear DTCs: " + t.getMessage());
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

        String vin = "";
        try {
            // Try the BYD-specific system property first
            vin = getSystemProperty("ro.byd.vin", "");
            if (vin.isEmpty()) {
                Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
                Method getVin = managerClass.getMethod("getVin");
                Object r = getVin.invoke(autoManager);
                if (r != null) vin = r.toString();
            }
        } catch (Throwable t) {
            Log.w(TAG, "VIN read failed: " + t.getMessage());
        }
        call.resolve(new JSObject().put("vin", vin != null ? vin : ""));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reflection helpers — each call is fully isolated so one failure doesn't
    // prevent the next field from being read.
    // ──────────────────────────────────────────────────────────────────────────

    private void tryReflectInt(Class<?> cls, Object instance, String methodName,
                               JSObject out, String key) {
        try {
            Method m = cls.getMethod(methodName);
            Object r = m.invoke(instance);
            if (r instanceof Integer) out.put(key, (Integer) r);
            else if (r instanceof Number) out.put(key, ((Number) r).intValue());
        } catch (Throwable t) {
            Log.w(TAG, methodName + " failed: " + t.getMessage());
        }
    }

    private void tryReflectFloat(Class<?> cls, Object instance, String methodName,
                                 JSObject out, String key) {
        try {
            Method m = cls.getMethod(methodName);
            Object r = m.invoke(instance);
            if (r instanceof Float) out.put(key, (Float) r);
            else if (r instanceof Number) out.put(key, ((Number) r).floatValue());
        } catch (Throwable t) {
            Log.w(TAG, methodName + " failed: " + t.getMessage());
        }
    }
}
