'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Shield, Car, Bluetooth, Check, ChevronRight, ChevronLeft, Globe, Zap } from 'lucide-react';
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
                    value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(Number(e.target.value))}
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
                <Button
                  onClick={() => {
                    setConnecting(true);
                    setTimeout(() => {
                      setConnecting(false);
                      handleNext();
                    }, 2000);
                  }}
                  disabled={connecting}
                  className="w-full bg-[#1A2332] hover:bg-[#1A2332]/80 border border-white/10 text-evdx-text h-14 rounded-xl text-base"
                >
                  <Bluetooth size={20} className="mr-2" />
                  {connecting ? t('scanningForAdapters') : t('connectAdapter')}
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
