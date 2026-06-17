'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Shield, Car, Bluetooth, Check, ChevronRight, ChevronLeft, Globe, Zap, Loader2, AlertCircle } from 'lucide-react';
import vehiclesData from '@/data/vehicles.json';

const STEPS = ['splash', 'language', 'privacy', 'vehicle', 'adapter', 'done'] as const;

export default function OnboardingFlow() {
  const { t, i18n } = useTranslation('onboarding');
  const { completeOnboarding, addVehicle, setActiveVehicle, updateSettings, connectDemo, settings } = useAppStore();
  const [step, setStep] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState(60);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [scannedDevices, setScannedDevices] = useState<import('@/lib/ble-service').ScannedDevice[]>([]);

  const currentStep = STEPS[step];
  const isRTL = settings.language === 'ar';

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleLanguageSelect = (lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
    handleNext();
  };

  const handlePrivacyAccept = () => {
    if (privacyAccepted) {
      handleNext();
    }
  };

  const handleVehicleNext = () => {
    if (selectedBrand && selectedModel) {
      const brand = vehiclesData.find((b) => b.id === selectedBrand);
      const vehicle = {
        id: `${selectedBrand}-${Date.now()}`,
        brand: brand?.name || selectedBrand,
        model: selectedModel,
        year: new Date().getFullYear(),
        batteryCapacity,
        maxChargePower: brand?.chargingSpecs?.dcMax || 50,
      };
      addVehicle(vehicle);
      setActiveVehicle(vehicle);
      handleNext();
    }
  };

  const handleDemoConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      connectDemo();
      setConnecting(false);
      handleNext();
    }, 1500);
  };

  /**
   * Real adapter connection flow from onboarding.
   *
   * Previously this button was a fake 2-second timer — it set `connecting=true`,
   * waited 2s, set `connecting=false`, and called `handleNext()` without ever
   * requesting permissions or scanning. The user reached the main app with no
   * permissions granted and no adapter paired, and had to manually open the
   * Connect overlay to do it all again.
   *
   * Now this:
   *  1. Requests BLE permissions (Android 12+: BLUETOOTH_CONNECT + BLUETOOTH_SCAN)
   *  2. Initializes the BLE service
   *  3. Scans for 8 seconds
   *  4. If devices found: shows the list inline so the user can pick one
   *  5. On pick: connects, runs ELM327 init, starts polling
   *  6. On success: advances to the "done" step
   *  7. On failure (no devices, no permissions, scan error): shows the error
   *     inline and offers a "Skip — connect later" button so the user can
   *     still complete onboarding without an adapter.
   */
  const handleAdapterConnect = async () => {
    setConnecting(true);
    setConnectError('');
    setScannedDevices([]);

    try {
      const { requestBlePermissions } = await import('@/lib/permissions');
      const permResult = await requestBlePermissions();
      if (!permResult.granted) {
        setConnectError(t('permissionsRequired', { missing: permResult.missingPermissions.join(', ') }));
        setConnecting(false);
        return;
      }

      const { bleService } = await import('@/lib/ble-service');
      await bleService.initialize();
      const devices = await bleService.scan(8000);
      setScannedDevices(devices);

      if (devices.length === 0) {
        setConnectError(t('noAdaptersFound'));
      }
      // If devices found, the inline list (rendered below) lets the user pick.
      // Don't auto-advance — wait for selection.
    } catch (error: any) {
      console.error('Onboarding scan error:', error);
      setConnectError(error?.message || t('scanFailed'));
    } finally {
      setConnecting(false);
    }
  };

  const handleAdapterPick = async (device: import('@/lib/ble-service').ScannedDevice) => {
    setConnecting(true);
    setConnectError('');
    try {
      const { bleService } = await import('@/lib/ble-service');
      const connected = await bleService.connect(device.deviceId, device.profile);
      if (connected) {
        const adapterInfo = bleService.getAdapterInfo();
        useAppStore.getState().updateDeviceInfo({
          name: device.name,
          type: 'bluetooth',
          adapterId: device.deviceId,
          signalStrength: device.rssi,
          quality: device.rssi > -50 ? 'excellent' : device.rssi > -70 ? 'good' : device.rssi > -85 ? 'fair' : 'poor',
          firmware: adapterInfo?.firmware || '',
          chipset: adapterInfo?.chipset || '',
          protocol: adapterInfo?.protocol || '',
          isClone: adapterInfo?.isClone || false,
          voltage: adapterInfo?.voltage || 0,
          vin: adapterInfo?.vin || '',
        });
        useAppStore.getState().setConnectionMode('bluetooth');
        useAppStore.getState().setConnectionStatus('connected');
        bleService.startPolling((pid, value) => {
          useAppStore.getState().parseOBDResponse(value);
        });
        handleNext();
      } else {
        setConnectError(t('connectFailed'));
      }
    } catch (error: any) {
      console.error('Onboarding connect error:', error);
      setConnectError(error?.message || t('connectFailed'));
    } finally {
      setConnecting(false);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  const selectedBrandData = vehiclesData.find((b) => b.id === selectedBrand);

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Splash */}
          {currentStep === 'splash' && (
            <motion.div
              key="splash"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-evdx-primary to-evdx-purple flex items-center justify-center mb-8"
              >
                <Zap size={48} className="text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-evdx-text mb-2">EVDx</h1>
              <p className="text-evdx-text-secondary mb-2">{t('welcomeSubtitle')}</p>
              <p className="text-xs text-evdx-text-secondary/60 mb-1">
                By Dr. Waleed Mandour
              </p>
              <p className="text-[10px] text-evdx-text-secondary/40 mb-10">
                &copy; 2026 &middot; github.com/waleedmandour/EVD
              </p>
              <Button
                onClick={handleNext}
                className="bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold px-12 h-12 rounded-xl"
              >
                {t('getStarted')}
                {isRTL ? <ChevronLeft className="ml-2" size={18} /> : <ChevronRight className="ml-2" size={18} />}
              </Button>
            </motion.div>
          )}

          {/* Step 2: Language */}
          {currentStep === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <Globe size={48} className="text-evdx-primary mb-6" />
              <h2 className="text-xl font-bold text-evdx-text mb-2">{t('selectLanguage')}</h2>
              <p className="text-sm text-evdx-text-secondary mb-8">{t('languageDescription')}</p>
              <div className="flex gap-4 w-full max-w-xs">
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="flex-1 py-4 px-6 rounded-xl border-2 border-white/10 hover:border-evdx-primary bg-[#1A2332] text-evdx-text text-lg font-semibold transition-all hover:bg-evdx-primary/10"
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageSelect('ar')}
                  className="flex-1 py-4 px-6 rounded-xl border-2 border-white/10 hover:border-evdx-primary bg-[#1A2332] text-evdx-text text-lg font-semibold transition-all hover:bg-evdx-primary/10"
                >
                  العربية
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Privacy */}
          {currentStep === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <Shield size={48} className="text-evdx-green mb-6" />
              <h2 className="text-xl font-bold text-evdx-text mb-2">{t('privacyTitle')}</h2>
              <p className="text-sm text-evdx-text-secondary mb-6 leading-relaxed">{t('privacyText')}</p>
              <div className="space-y-3 text-start w-full mb-6">
                {[t('privacyBullet1'), t('privacyBullet2'), t('privacyBullet3'), t('privacyBullet4')].map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check size={16} className="text-evdx-green mt-0.5 shrink-0" />
                    <span className="text-sm text-evdx-text-secondary">{bullet}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-3 mb-6 cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-[#1A2332] accent-evdx-primary"
                />
                <span className="text-sm text-evdx-text">{t('privacyAccept')}</span>
              </label>
              <Button
                onClick={handlePrivacyAccept}
                disabled={!privacyAccepted}
                className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold h-12 rounded-xl disabled:opacity-40"
              >
                {t('nextStep')}
              </Button>
            </motion.div>
          )}

          {/* Step 4: Vehicle Setup */}
          {currentStep === 'vehicle' && (
            <motion.div
              key="vehicle"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Car size={48} className="text-evdx-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-evdx-text text-center mb-2">{t('vehicleSetup')}</h2>
              <p className="text-sm text-evdx-text-secondary text-center mb-6">{t('vehicleSetupDescription')}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-evdx-text-secondary mb-1 block">{t('selectBrand')}</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setSelectedModel('');
                    }}
                    className="w-full bg-[#1A2332] border border-white/10 rounded-xl px-4 py-3 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                  >
                    <option value="">{t('selectBrand')}</option>
                    {vehiclesData.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {selectedBrandData && (
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">{t('selectModel')}</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-[#1A2332] border border-white/10 rounded-xl px-4 py-3 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                    >
                      <option value="">{t('selectModel')}</option>
                      {selectedBrandData.models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm text-evdx-text-secondary mb-1 block">{t('batterySize')}</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={batteryCapacity}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      // Reject NaN, negative, and absurdly large values.
                      // The previous implementation accepted anything including
                      // 0, negative, and 100000 — which would then break the
                      // simulator's SOC drain calculation (division by zero
                      // or ridiculous range values).
                      if (!isNaN(n) && n >= 0 && n <= 1000) {
                        setBatteryCapacity(n);
                      }
                    }}
                    className="w-full bg-[#1A2332] border border-white/10 rounded-xl px-4 py-3 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                    placeholder={t('batterySizeHint')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 border-white/10 text-evdx-text hover:bg-[#1A2332] h-11 rounded-xl"
                  >
                    {t('previousStep')}
                  </Button>
                  <Button
                    onClick={handleVehicleNext}
                    disabled={!selectedBrand || !selectedModel}
                    className="flex-1 bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold h-11 rounded-xl disabled:opacity-40"
                  >
                    {t('nextStep')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Adapter Setup */}
          {currentStep === 'adapter' && (
            <motion.div
              key="adapter"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <Bluetooth size={48} className="text-evdx-primary mb-6" />
              <h2 className="text-xl font-bold text-evdx-text mb-2">{t('adapterSetup')}</h2>
              <p className="text-sm text-evdx-text-secondary mb-8">{t('adapterSetupDescription')}</p>

              <div className="space-y-3 w-full mb-6">
                {connectError && (
                  <div className="flex items-start gap-2 bg-evdx-critical/10 border border-evdx-critical/20 rounded-lg p-3 text-start">
                    <AlertCircle size={16} className="text-evdx-critical shrink-0 mt-0.5" />
                    <p className="text-xs text-evdx-critical">{connectError}</p>
                  </div>
                )}

                {scannedDevices.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-xs text-evdx-text-secondary mb-2 text-start">{t('foundDevicesSelect', { count: scannedDevices.length, ns: 'common' })}</p>
                    {scannedDevices.map((device) => (
                      <button
                        key={device.deviceId}
                        onClick={() => handleAdapterPick(device)}
                        disabled={connecting}
                        className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors disabled:opacity-50 text-start ${
                          device.isOBDLike
                            ? 'bg-[#0D1117] hover:bg-evdx-primary/5 border border-evdx-primary/20'
                            : 'bg-[#0D1117]/60 hover:bg-evdx-primary/5 border border-white/5'
                        }`}
                      >
                        <Bluetooth size={18} className={device.isOBDLike ? 'text-evdx-primary' : 'text-evdx-text-secondary'} />
                        <div className="flex-1">
                          <span className="text-sm text-evdx-text block">{device.name}</span>
                          <span className="text-xs text-evdx-text-secondary">RSSI: {device.rssi} dBm</span>
                        </div>
                        {connecting && <Loader2 size={16} className="animate-spin text-evdx-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleAdapterConnect}
                  disabled={connecting}
                  className="w-full bg-[#1A2332] hover:bg-[#1A2332]/80 border border-white/10 text-evdx-text h-14 rounded-xl text-base"
                >
                  {connecting ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <Bluetooth size={20} className="mr-2" />
                  )}
                  {connecting ? t('scanning', { ns: 'common' }) : t('connectAdapter')}
                </Button>

                <div className="text-center text-sm text-evdx-text-secondary">— {t('or')} —</div>

                <Button
                  onClick={handleDemoConnect}
                  disabled={connecting}
                  className="w-full bg-evdx-primary/10 hover:bg-evdx-primary/20 border border-evdx-primary/30 text-evdx-primary h-14 rounded-xl text-base font-semibold"
                >
                  <Zap size={20} className="mr-2" />
                  {connecting ? t('connectionTest') : t('tryDemo')}
                </Button>
                <p className="text-xs text-evdx-text-secondary/60">{t('demoDataNote')}</p>

                {/* Skip button — lets the user complete onboarding without an adapter.
                    They can connect later via the main app's Connect button. */}
                <Button
                  onClick={handleNext}
                  variant="ghost"
                  className="w-full text-evdx-text-secondary hover:text-evdx-text h-10 text-xs"
                >
                  {t('skipConnectLater')}
                </Button>
              </div>

              <Button
                onClick={handleBack}
                variant="ghost"
                className="text-evdx-text-secondary hover:text-evdx-text"
              >
                {t('previousStep')}
              </Button>
            </motion.div>
          )}

          {/* Step 6: Done */}
          {currentStep === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-evdx-green/20 flex items-center justify-center mb-6"
              >
                <Check size={40} className="text-evdx-green" />
              </motion.div>
              <h2 className="text-xl font-bold text-evdx-text mb-2">{t('setupComplete')}</h2>
              <p className="text-sm text-evdx-text-secondary mb-8">{t('setupCompleteDescription')}</p>

              <div className="space-y-3 w-full mb-8 text-start">
                {['dashboard', 'battery', 'diagnostics', 'charging'].map((s) => (
                  <div key={s} className="flex items-center gap-3 bg-[#1A2332] rounded-lg px-4 py-3">
                    <Check size={16} className="text-evdx-primary shrink-0" />
                    <span className="text-sm text-evdx-text-secondary">{t(`quickStartSteps.${s}`)}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleFinish}
                className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold h-12 rounded-xl"
              >
                {t('finishSetup')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicator */}
        {step > 0 && step < STEPS.length - 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {STEPS.slice(1, -1).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step - 1 ? 'bg-evdx-primary' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
