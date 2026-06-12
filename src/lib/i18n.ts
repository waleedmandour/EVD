'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import commonEn from '@/locales/en/common.json';
import commonAr from '@/locales/ar/common.json';
import dashboardEn from '@/locales/en/dashboard.json';
import dashboardAr from '@/locales/ar/dashboard.json';
import batteryEn from '@/locales/en/battery.json';
import batteryAr from '@/locales/ar/battery.json';
import diagnosticsEn from '@/locales/en/diagnostics.json';
import diagnosticsAr from '@/locales/ar/diagnostics.json';
import voiceEn from '@/locales/en/voice.json';
import voiceAr from '@/locales/ar/voice.json';
import alertsEn from '@/locales/en/alerts.json';
import alertsAr from '@/locales/ar/alerts.json';
import chargingEn from '@/locales/en/charging.json';
import chargingAr from '@/locales/ar/charging.json';
import sessionsEn from '@/locales/en/sessions.json';
import sessionsAr from '@/locales/ar/sessions.json';
import maintenanceEn from '@/locales/en/maintenance.json';
import maintenanceAr from '@/locales/ar/maintenance.json';
import settingsEn from '@/locales/en/settings.json';
import settingsAr from '@/locales/ar/settings.json';
import onboardingEn from '@/locales/en/onboarding.json';
import onboardingAr from '@/locales/ar/onboarding.json';

const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    battery: batteryEn,
    diagnostics: diagnosticsEn,
    voice: voiceEn,
    alerts: alertsEn,
    charging: chargingEn,
    sessions: sessionsEn,
    maintenance: maintenanceEn,
    settings: settingsEn,
    onboarding: onboardingEn,
  },
  ar: {
    common: commonAr,
    dashboard: dashboardAr,
    battery: batteryAr,
    diagnostics: diagnosticsAr,
    voice: voiceAr,
    alerts: alertsAr,
    charging: chargingAr,
    sessions: sessionsAr,
    maintenance: maintenanceAr,
    settings: settingsAr,
    onboarding: onboardingAr,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    ns: ['common', 'dashboard', 'battery', 'diagnostics', 'voice', 'alerts', 'charging', 'sessions', 'maintenance', 'settings', 'onboarding'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'evdx-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
