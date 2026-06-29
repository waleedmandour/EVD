package com.waleedmandour.evdx.byd;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

/**
 * EVDx BYD Native Reader — standalone BYD vehicle data reader.
 *
 * This class contains the SAME detection and data-reading logic as
 * BYDAutoPlugin.java, but with NO Capacitor dependency. It returns
 * plain Java objects (Map<String, Object>) instead of JSObject.
 *
 * This allows NativeDashboardActivity to read BYD vehicle data directly,
 * without going through the Capacitor bridge. The native dashboard can
 * therefore display vehicle data INSTANTLY on boot — before the WebView
 * has loaded.
 *
 * BYDAutoPlugin delegates to this class for its core logic, so both the
 * native dashboard and the WebView see the same data.
 *
 * Detection methods (checked in order):
 *   1. System property ro.byd.model
 *   2. System property ro.build.byd.project
 *   3. System property ro.product.brand == "BYD"
 *   4. Any of the 10 com.byd.auto.* system packages installed
 *
 * All reflection calls are individually try/caught — a single failing
 * getter never prevents the rest from being read.
 */
public class BYDNativeReader {

    private static final String TAG = "EVDx/BYDNativeReader";

    // Confirmed BYD DiLink 3.0 system packages (from binti2 reference repo).
    static final String[] BYD_SYSTEM_PACKAGES = {
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

    // BYD Auto Manager class names (internal framework, not in AOSP)
    static final String BYD_AUTO_MANAGER_CLASS    = "com.byd.auto.manager.BYDAutoManager";
    static final String BYD_ENERGY_DEVICE_CLASS   = "com.byd.auto.manager.BYDAutoEnergyDevice";
    static final String BYD_CHARGING_DEVICE_CLASS = "com.byd.auto.manager.BYDAutoChargingDevice";
    static final String BYD_SPEED_DEVICE_CLASS    = "com.byd.auto.manager.BYDAutoSpeedDevice";
    static final String BYD_TYRE_DEVICE_CLASS     = "com.byd.auto.manager.BYDAutoTyreDevice";
    static final String BYD_DTC_DEVICE_CLASS      = "com.byd.auto.manager.BYDAutoDtcDevice";
    static final String BYD_AC_DEVICE_CLASS       = "com.byd.auto.manager.BYDAutoAcDevice";
    static final String BYD_VEHICLE_DEVICE_CLASS  = "com.byd.auto.manager.BYDAutoVehicleDevice";

    private final Context context;
    private boolean isBYD = false;
    private boolean detectionDone = false;
    private Object autoManager = null;

    public BYDNativeReader(Context context) {
        this.context = context != null ? context.getApplicationContext() : null;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // System property helper
    // ──────────────────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────────────────
    // Detection
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Detect if running on a BYD head unit.
     * Result is cached after the first call.
     */
    public boolean isBYD() {
        if (detectionDone) return isBYD;
        detectionDone = true;

        if (context == null) {
            isBYD = false;
            return false;
        }

        try {
            isBYD = detectBYDHeadUnit();
        } catch (Throwable t) {
            Log.e(TAG, "BYD detection threw, defaulting to non-BYD mode", t);
            isBYD = false;
        }
        Log.i(TAG, "BYD head unit detected: " + isBYD);
        return isBYD;
    }

    /**
     * Get BYD device info (brand, model, firmware, Android version).
     * Returns null if not on a BYD head unit.
     */
    public Map<String, String> getBYDInfo() {
        if (!isBYD()) return null;

        Map<String, String> info = new HashMap<>();
        info.put("brand", getSystemProperty("ro.product.brand", "BYD"));
        String model = getSystemProperty("ro.product.model", "Unknown");
        String bydModel = getSystemProperty("ro.byd.model", "");
        info.put("model", bydModel.isEmpty() ? model : bydModel);
        info.put("firmware", getSystemProperty("ro.build.display.id", "Unknown"));
        info.put("androidVersion", String.valueOf(Build.VERSION.SDK_INT));
        return info;
    }

    private boolean detectBYDHeadUnit() {
        if (context == null) return false;
        PackageManager pm = context.getPackageManager();

        // 1. ro.byd.model
        String bydModel = getSystemProperty("ro.byd.model", "");
        if (!bydModel.isEmpty()) {
            Log.i(TAG, "BYD detected via ro.byd.model = " + bydModel);
            return true;
        }

        // 2. ro.build.byd.project
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

    // ──────────────────────────────────────────────────────────────────────────
    // BYDAutoManager initialization
    // ──────────────────────────────────────────────────────────────────────────

    private boolean initAutoManager() {
        if (autoManager != null) return true;
        if (!isBYD()) return false;

        try {
            Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
            Method getInstance = managerClass.getMethod("getInstance", Context.class);
            autoManager = getInstance.invoke(null, context);
            Log.i(TAG, "BYDAutoManager initialized successfully");
            return true;
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "BYDAutoManager class not found — locked-down BYD firmware?");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to initialize BYDAutoManager: " + t.getMessage());
        }
        return false;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Vehicle data reading
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Read all vehicle data from BYD's internal CAN bus.
     *
     * Returns a Map with keys: soc, soh, voltage, current, power, speed,
     * motorRPM, motorTemp, batteryTemp, ambientTemp, cabinTemp, odometer,
     * range, chargingStatus, cellMaxV, cellMinV, tirePressures (Map),
     * acOn, doorLocked, vin.
     *
     * Returns null if not on a BYD head unit or BYDAutoManager unavailable.
     * Every field is read in its own try/catch — a single failing getter
     * never prevents the rest.
     */
    public Map<String, Object> readVehicleData() {
        if (!isBYD() || !initAutoManager()) {
            return null;
        }

        Map<String, Object> data = new HashMap<>();

        // ─── Battery / Energy device ─────────────────────────────────────────
        try {
            Class<?> energyClass = Class.forName(BYD_ENERGY_DEVICE_CLASS);
            Method getInstance = energyClass.getMethod("getInstance", Context.class);
            Object energyDevice = getInstance.invoke(null, context);

            putReflectInt  (energyClass, energyDevice, "getSoc",              data, "soc");
            putReflectInt  (energyClass, energyDevice, "getSoh",              data, "soh");
            putReflectFloat(energyClass, energyDevice, "getVoltage",          data, "voltage");
            putReflectFloat(energyClass, energyDevice, "getCurrent",          data, "current");
            putReflectFloat(energyClass, energyDevice, "getBatteryTemperature", data, "batteryTemp");
            putReflectInt  (energyClass, energyDevice, "getMaxCellVoltage",   data, "cellMaxV");
            putReflectInt  (energyClass, energyDevice, "getMinCellVoltage",   data, "cellMinV");
        } catch (Throwable t) {
            Log.w(TAG, "EnergyDevice access failed: " + t.getMessage());
        }

        // ─── Speed device (speed + motor RPM + motor temp) ───────────────────
        try {
            Class<?> speedClass = Class.forName(BYD_SPEED_DEVICE_CLASS);
            Method getInstance = speedClass.getMethod("getInstance", Context.class);
            Object speedDevice = getInstance.invoke(null, context);
            putReflectInt  (speedClass, speedDevice, "getSpeed",           data, "speed");
            putReflectInt  (speedClass, speedDevice, "getMotorSpeed",      data, "motorRPM");
            putReflectFloat(speedClass, speedDevice, "getMotorTemperature", data, "motorTemp");
        } catch (Throwable t) {
            Log.w(TAG, "Speed read failed: " + t.getMessage());
        }

        // ─── Charging device ─────────────────────────────────────────────────
        try {
            Class<?> chargingClass = Class.forName(BYD_CHARGING_DEVICE_CLASS);
            Method getInstance = chargingClass.getMethod("getInstance", Context.class);
            Object chargingDevice = getInstance.invoke(null, context);
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

        // ─── Tyre / TPMS device ──────────────────────────────────────────────
        try {
            Class<?> tyreClass = Class.forName(BYD_TYRE_DEVICE_CLASS);
            Method getInstance = tyreClass.getMethod("getInstance", Context.class);
            Object tyreDevice = getInstance.invoke(null, context);
            try {
                Method m = tyreClass.getMethod("getTyrePressure");
                Object r = m.invoke(tyreDevice);
                if (r instanceof int[]) {
                    int[] p = (int[]) r;
                    Map<String, Integer> td = new HashMap<>();
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

        // ─── AC device (cabin + ambient temperature) ─────────────────────────
        try {
            Class<?> acClass = Class.forName(BYD_AC_DEVICE_CLASS);
            Method getInstance = acClass.getMethod("getInstance", Context.class);
            Object acDevice = getInstance.invoke(null, context);

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
                // Fall through
            } catch (Throwable t) {
                Log.w(TAG, "getTemprature failed: " + t.getMessage());
            }
            // Attempt 2: getTemperature (corrected spelling)
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

        // ─── Vehicle device (odometer + remaining range) ─────────────────────
        try {
            Class<?> vehicleClass = Class.forName(BYD_VEHICLE_DEVICE_CLASS);
            Method getInstance = vehicleClass.getMethod("getInstance", Context.class);
            Object vehicleDevice = getInstance.invoke(null, context);
            putReflectInt(vehicleClass, vehicleDevice, "getOdometer",      data, "odometer");
            putReflectInt(vehicleClass, vehicleDevice, "getRemainingRange", data, "range");
        } catch (Throwable t) {
            Log.w(TAG, "VehicleDevice access failed: " + t.getMessage());
        }

        // ─── Derived: power (kW) ─────────────────────────────────────────────
        try {
            if (data.containsKey("voltage") && data.containsKey("current")) {
                double v = ((Number) data.get("voltage")).doubleValue();
                double a = ((Number) data.get("current")).doubleValue();
                data.put("power", Math.round((v * a) / 1000.0 * 10.0) / 10.0);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Power calc failed: " + t.getMessage());
        }

        // ─── Derived: range fallback (SOC * 4.2 for BYD Yuan Plus ~420km) ───
        try {
            if (!data.containsKey("range") && data.containsKey("soc")) {
                int soc = ((Number) data.get("soc")).intValue();
                data.put("range", Math.round(soc * 4.2f));
            }
        } catch (Throwable t) {
            Log.w(TAG, "Range calc failed: " + t.getMessage());
        }

        return data;
    }

    /**
     * Read VIN from BYD's vehicle data.
     */
    public String readVIN() {
        if (!isBYD() || !initAutoManager()) return "";

        try {
            String vin = getSystemProperty("ro.byd.vin", "");
            if (vin.isEmpty() && autoManager != null) {
                Class<?> managerClass = Class.forName(BYD_AUTO_MANAGER_CLASS);
                Method getVin = managerClass.getMethod("getVin");
                Object r = getVin.invoke(autoManager);
                if (r != null) vin = r.toString();
            }
            return vin != null ? vin : "";
        } catch (Throwable t) {
            Log.w(TAG, "VIN read failed: " + t.getMessage());
            return "";
        }
    }

    /**
     * Read DTCs via BYD's native DTC system.
     * Returns a list of DTC code strings.
     */
    public java.util.List<String> readDTCs() {
        java.util.List<String> dtcs = new java.util.ArrayList<>();
        if (!isBYD() || !initAutoManager()) return dtcs;

        try {
            Class<?> dtcClass = Class.forName(BYD_DTC_DEVICE_CLASS);
            Method getInstance = dtcClass.getMethod("getInstance", Context.class);
            Object dtcDevice = getInstance.invoke(null, context);
            try {
                Method getDtcList = dtcClass.getMethod("getDtcList");
                Object result = getDtcList.invoke(dtcDevice);
                if (result instanceof java.util.List) {
                    for (Object dtc : (java.util.List<?>) result) {
                        if (dtc != null) dtcs.add(dtc.toString());
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "getDtcList failed: " + t.getMessage());
            }
        } catch (Throwable t) {
            Log.w(TAG, "DtcDevice access failed: " + t.getMessage());
        }
        return dtcs;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reflection helpers
    // ──────────────────────────────────────────────────────────────────────────

    private void putReflectInt(Class<?> cls, Object instance, String methodName,
                               Map<String, Object> out, String key) {
        try {
            Method m = cls.getMethod(methodName);
            Object r = m.invoke(instance);
            if (r instanceof Integer) out.put(key, (Integer) r);
            else if (r instanceof Number) out.put(key, ((Number) r).intValue());
        } catch (Throwable t) {
            Log.w(TAG, methodName + " failed: " + t.getMessage());
        }
    }

    private void putReflectFloat(Class<?> cls, Object instance, String methodName,
                                 Map<String, Object> out, String key) {
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
