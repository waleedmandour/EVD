'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Capacitor } from '@capacitor/core';
import { Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react';
import { formatCommandResponse } from '@/lib/speech';

// ─── Page Summary Data ─────────────────────────────────────────────────────────

const PAGE_SUMMARIES: Record<string, Record<string, string>> = {
  dashboard: {
    en: 'Dashboard: Shows your speed, battery charge, power output, temperatures, and active alerts at a glance.',
    ar: 'لوحة القيادة: تعرض سرعتك وشحن البطارية واستهلاك الطاقة ودرجات الحرارة والتنبيهات النشطة في لمحة.',
  },
  battery: {
    en: 'Battery: Displays State of Charge, State of Health, cell voltages, thermal management, and degradation trends.',
    ar: 'البطارية: تعرض حالة الشحن وصحة البطارية وجهد الخلايا والإدارة الحرارية واتجاهات التدهور.',
  },
  charging: {
    en: 'Charging: Monitors charging sessions in real-time — power, voltage, current, cost, and charge curve.',
    ar: 'الشحن: يراقب جلسات الشحن في الوقت الفعلي — الطاقة والجهد والتيار والتكلفة ومنحنى الشحن.',
  },
  diagnostics: {
    en: 'Diagnostics: Scans for fault codes (DTCs), shows severity levels, monitor readiness, and recommended fixes.',
    ar: 'التشخيص: يفحص رموز الأعطال ويعرض مستويات الخطورة وجاهزية المراقبة والإصلاحات المقترحة.',
  },
  liveData: {
    en: 'Live Data: Real-time multi-parameter graphing of vehicle telemetry with time window selection and CSV export.',
    ar: 'البيانات المباشرة: رسم بياني متعدد المعلمات في الوقت الفعلي مع تصدير CSV.',
  },
  sessions: {
    en: 'Sessions: Trip analytics with eco-score breakdown, energy consumption, and EV vs ICE cost comparison.',
    ar: 'الجلسات: تحليلات الرحلات مع درجة القيادة الاقتصادية ومقارنة التكلفة.',
  },
  maintenance: {
    en: 'Maintenance: Service tracker with next-due reminders, cost logging, and full service history.',
    ar: 'الصيانة: متتبع الخدمة مع تذكيرات الاستحقاق وتسجيل التكاليف وسجل الخدمة الكامل.',
  },
  device: {
    en: 'Device: Shows your OBD adapter info, signal strength, connection quality, and VIN.',
    ar: 'الجهاز: يعرض معلومات محول OBD وقوة الإشارة وجودة الاتصال ورقم الهيكل.',
  },
  settings: {
    en: 'Settings: Configure language, voice assistant, units, alert thresholds, data export, and privacy.',
    ar: 'الإعدادات: تكوين اللغة ومساعد الصوت والوحدات وعتبات التنبيه وتصدير البيانات والخصوصية.',
  },
  aiBattery: {
    en: 'AI Battery Predictor: Machine learning-based battery degradation forecast with personalized care recommendations.',
    ar: 'التنبؤ بالبطارية: توقعات تدهور البطارية بالتعلم الآلي مع توصيات رعاية مخصصة.',
  },
  aiDtc: {
    en: 'AI Smart DTC Analyzer: Root cause analysis correlating multiple fault codes with real-time vehicle data.',
    ar: 'محلل الأعطال الذكي: تحليل السبب الجذبي بربط رموز الأعطال المتعددة مع بيانات السيارة.',
  },
  aiCoach: {
    en: 'AI Eco-Driving Coach: Personalized driving tips to maximize range and extend battery life.',
    ar: 'مدرب القيادة الاقتصادية: نصائح قيادة مخصصة لتعظيم المدى وإطالة عمر البطارية.',
  },
};

export default function VoiceAssistant() {
  const { t } = useTranslation('voice');
  const { voiceListening, setVoiceListening, settings, setActiveTab, vehicleData, dtcs, activeTab, chargingData, tripData, ecoScore } = useAppStore();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const processingRef = useRef(false);
  const listenerHandlesRef = useRef<any[]>([]);

  const lang = settings.language;

  // Don't render if voice assistant is disabled
  if (!settings.voiceAssistant) return null;

  // Generate dynamic page summary
  const getPageSummary = useCallback((): string => {
    const baseSummary = PAGE_SUMMARIES[activeTab]?.[lang] || PAGE_SUMMARIES[activeTab]?.en || '';

    // Add dynamic data to summary
    let dynamicPart = '';
    if (activeTab === 'dashboard') {
      if (vehicleData.soc > 0) {
        dynamicPart = lang === 'ar'
          ? ` الشحن ${vehicleData.soc.toFixed(0)}%، السرعة ${vehicleData.speed.toFixed(0)} كم/س.`
          : ` Charge ${vehicleData.soc.toFixed(0)}%, Speed ${vehicleData.speed.toFixed(0)} km/h.`;
      }
      if (dtcs.length > 0) {
        dynamicPart += lang === 'ar'
          ? ` يوجد ${dtcs.length} تنبيه نشط.`
          : ` ${dtcs.length} active alert(s).`;
      }
    } else if (activeTab === 'battery') {
      dynamicPart = lang === 'ar'
        ? ` حالة الشحن ${vehicleData.soc.toFixed(0)}%، صحة البطارية ${vehicleData.soh.toFixed(0)}%.`
        : ` SOC ${vehicleData.soc.toFixed(0)}%, SOH ${vehicleData.soh.toFixed(0)}%.`;
    } else if (activeTab === 'charging') {
      if (chargingData.isCharging) {
        dynamicPart = lang === 'ar'
          ? ` جاري الشحن بقدرة ${chargingData.power.toFixed(1)} كيلووات.`
          : ` Charging at ${chargingData.power.toFixed(1)} kW.`;
      }
    } else if (activeTab === 'diagnostics') {
      dynamicPart = lang === 'ar'
        ? ` يوجد ${dtcs.length} رمز عطل.`
        : ` ${dtcs.length} fault code(s).`;
    } else if (activeTab === 'sessions') {
      dynamicPart = lang === 'ar'
        ? ` المسافة ${tripData.distance.toFixed(1)} كم، درجة القيادة ${ecoScore.overall}/100.`
        : ` Distance ${tripData.distance.toFixed(1)} km, Eco score ${ecoScore.overall}/100.`;
    }

    return baseSummary + dynamicPart;
  }, [activeTab, lang, vehicleData, dtcs, chargingData, tripData, ecoScore]);

  const processCommand = useCallback((transcript: string) => {
    const cmd = transcript.toLowerCase().trim();
    let response = '';

    // ─── Battery ───────────────────────────────────────────────────
    // MSA: بطارية, حالة البطارية, مستوى الشحن, صحة البطارية
    // Gulf: اشحن, كم الشحن, حالة البطاريه
    // Egyptian: البطارية, شحن البطارية, صحة البطارية, قد ايه الشحن
    if (cmd.includes('battery') || cmd.includes('بطاري') || cmd.includes('بطارية') || cmd.includes('شحن البطارية') || cmd.includes('حالة البطارية') || cmd.includes('مستوى الشحن') || cmd.includes('صحة البطارية') || cmd.includes('صحه البطارية') || cmd.includes('حالة الشحن') || cmd.includes('كم الشحن') || cmd.includes('قد ايه الشحن') || cmd.includes('اد ايه الشحن') || cmd.includes('نسبة الشحن') || cmd.includes('اشحن')) {
      // Sub-detect: battery health vs battery level
      if (cmd.includes('صحة') || cmd.includes('صحه') || cmd.includes('health') || cmd.includes('حالة البطارية') || cmd.includes('صحة البطارية')) {
        const statusAr = vehicleData.soh > 80 ? 'حالة جيدة' : vehicleData.soh > 60 ? 'تحتاج متابعة' : 'تحتاج استبدال';
        const statusEn = vehicleData.soh > 80 ? 'good condition' : vehicleData.soh > 60 ? 'needs monitoring' : 'needs replacement';
        response = lang === 'ar'
          ? `صحة البطارية ${vehicleData.soh.toFixed(0)}%، ${statusAr}`
          : `Battery health is ${vehicleData.soh.toFixed(0)}%, ${statusEn}`;
      } else {
        response = lang === 'ar'
          ? `شحن البطارية ${vehicleData.soc.toFixed(0)}%، الصحة ${vehicleData.soh.toFixed(0)}%`
          : `Battery at ${vehicleData.soc.toFixed(0)}%, Health ${vehicleData.soh.toFixed(0)}%`;
      }
      setActiveTab('battery');

    // ─── Range ─────────────────────────────────────────────────────
    // MSA: مدى, المسافة المتبقية
    // Gulf: كم المسافة, كم اقدر امشي, كم ابقى, كم باقي
    // Egyptian: قد ايه, هاوصل فين, أقدر أمشي قد ايه, كام كيلو
    } else if (cmd.includes('range') || cmd.includes('مدى') || cmd.includes('المسافة') || cmd.includes('كم المسافة') || cmd.includes('كم المسافة المتبقية') || cmd.includes('كم ابقى') || cmd.includes('كم باقي') || cmd.includes('عرض المدى') || cmd.includes('المسافة المتبقية') || cmd.includes('قد ايه') || cmd.includes('هاوصل فين') || cmd.includes('أقدر أمشي') || cmd.includes('اقدر امشي') || cmd.includes('كام كيلو') || cmd.includes('كم اقدر امشي') || cmd.includes('كم أقدر أمشي') || cmd.includes('كيلو')) {
      response = lang === 'ar'
        ? `المدى المتبقي ${vehicleData.range.toFixed(0)} كم`
        : `Range remaining: ${vehicleData.range.toFixed(0)} km`;

    // ─── Motor ─────────────────────────────────────────────────────
    // MSA: محرك, حرارة المحرك
    // Gulf: حرارة المحرك, درجة حرارة المحرك
    // Egyptian: الموتور, حرارة الموتور, الموتور سخن
    } else if (cmd.includes('motor') || cmd.includes('محرك') || cmd.includes('موتور') || cmd.includes('حرارة المحرك') || cmd.includes('درجة حرارة المحرك') || cmd.includes('حراره المحرك') || cmd.includes('حرارة الموتور') || cmd.includes('الموتور سخن') || cmd.includes('المحرك سخن')) {
      response = lang === 'ar'
        ? `درجة حرارة المحرك ${vehicleData.motorTemp.toFixed(0)} درجة مئوية`
        : `Motor temperature: ${vehicleData.motorTemp.toFixed(0)}°C`;
      setActiveTab('dashboard');

    // ─── Faults / Diagnostics ──────────────────────────────────────
    // MSA: أعطال, فحص الأعطال, تشخيص, رمز العطل
    // Gulf: عطل, أعطال, فحص, فيها عطل, ايش العطل
    // Egyptian: عطل, أعطال, فحص, في عطل, سكان, سكان للأعطال
    } else if (cmd.includes('fault') || cmd.includes('scan') || cmd.includes('أعطال') || cmd.includes('فحص') || cmd.includes('عطل') || cmd.includes('فحص الأعطال') || cmd.includes('تشخيص') || cmd.includes('رمز العطل') || cmd.includes('رموز الأعطال') || cmd.includes('افتح التشخيص') || cmd.includes('فتح التشخيص') || cmd.includes('فيها عطل') || cmd.includes('في عطل') || cmd.includes('ايش العطل') || cmd.includes('سكان') || cmd.includes('سكان للأعطال') || cmd.includes('اشيك')) {
      if (dtcs.length > 0) {
        response = lang === 'ar'
          ? `تم العثور على ${dtcs.length} رمز عطل`
          : `Found ${dtcs.length} fault code(s)`;
      } else {
        response = lang === 'ar' ? 'لا توجد أعطال، مركبتك بحالة جيدة' : 'No faults found. Your vehicle is healthy!';
      }
      setActiveTab('diagnostics');

    // ─── Clear Codes ───────────────────────────────────────────────
    // MSA: مسح الرموز, إزالة الأعطال
    // Gulf: امسح الرموز, مسح الأعطال
    // Egyptian: امسح الأعطال, مسح الكودات, نمسح الأعطال
    } else if (cmd.includes('clear code') || cmd.includes('مسح الرموز') || cmd.includes('مسح الرمز') || cmd.includes('مسح الأعطال') || cmd.includes('امسح الرموز') || cmd.includes('إزالة الأعطال') || cmd.includes('مسح الكودات') || cmd.includes('نمسح الأعطال') || cmd.includes('امسح الأعطال')) {
      response = lang === 'ar' ? 'تم مسح جميع الرموز التشخيصية' : 'All diagnostic codes have been cleared';

    // ─── Dashboard ─────────────────────────────────────────────────
    // MSA: لوحة القيادة, عرض لوحة
    // Gulf: لوحة القيادة, افتح لوحة القيادة
    // Egyptian: التابلو, الداشبورد, لوحة القيادة
    } else if (cmd.includes('dashboard') || cmd.includes('لوحة') || cmd.includes('لوحة القيادة') || cmd.includes('عرض لوحة') || cmd.includes('افتح لوحة القيادة') || cmd.includes('تابلو') || cmd.includes('داشبورد')) {
      setActiveTab('dashboard');
      response = lang === 'ar' ? 'تم فتح لوحة القيادة' : 'Switched to Dashboard';

    // ─── Charging ──────────────────────────────────────────────────
    // MSA: الشحن, حالة الشحن
    // Gulf: عرض الشحن, افتح الشحن
    // Egyptian: الشحن, بيشحن, بيشتغل شحن
    } else if (cmd.includes('charging') || cmd.includes('حالة الشحن') || cmd.includes('عرض الشحن') || cmd.includes('افتح الشحن') || cmd.includes('بيشحن') || cmd.includes('بيشتغل شحن') || cmd.includes('الشحن')) {
      // Avoid false match with "شحن البطارية" — that's caught by battery above
      if (!cmd.includes('بطارية') && !cmd.includes('battery') && !cmd.includes('بطاري')) {
        setActiveTab('charging');
        response = lang === 'ar' ? 'تم فتح صفحة الشحن' : 'Switched to Charging';
      } else {
        response = lang === 'ar'
          ? `شحن البطارية ${vehicleData.soc.toFixed(0)}%`
          : `Battery at ${vehicleData.soc.toFixed(0)}%`;
        setActiveTab('battery');
      }

    // ─── Sessions / Trips ──────────────────────────────────────────
    // MSA: رحلات, جلسات
    // Gulf: الرحلات, عرض الرحلات, الجلسات
    // Egyptian: التريب, الرحلات, الرحلة, مشاوير
    } else if (cmd.includes('session') || cmd.includes('trip') || cmd.includes('رحلات') || cmd.includes('رحلة') || cmd.includes('عرض الرحلات') || cmd.includes('الجلسات') || cmd.includes('عرض الجلسات') || cmd.includes('تريب') || cmd.includes('مشاوير') || cmd.includes('المشاوير')) {
      setActiveTab('sessions');
      response = lang === 'ar' ? 'تم فتح صفحة الرحلات' : 'Switched to Sessions';

    // ─── Maintenance ───────────────────────────────────────────────
    // MSA: صيانة, خدمة
    // Gulf: صيانه, عرض الصيانة, افتح الصيانة, خدمة
    // Egyptian: صيانة, التصليح, السيرفس
    } else if (cmd.includes('maintenance') || cmd.includes('service') || cmd.includes('صيانة') || cmd.includes('صيانه') || cmd.includes('عرض الصيانة') || cmd.includes('افتح الصيانة') || cmd.includes('خدمة') || cmd.includes('تصليح') || cmd.includes('التصليح') || cmd.includes('سيرفس')) {
      setActiveTab('maintenance');
      response = lang === 'ar' ? 'تم فتح صفحة الصيانة' : 'Switched to Maintenance';

    // ─── Settings ──────────────────────────────────────────────────
    // MSA: إعدادات, الإعدادات
    // Gulf: الإعدادات, افتح الإعدادات, ضبط
    // Egyptian: الإعدادات, الضبط, السيتينج
    } else if (cmd.includes('setting') || cmd.includes('إعداد') || cmd.includes('إعدادات') || cmd.includes('الإعدادات') || cmd.includes('عرض الإعدادات') || cmd.includes('افتح الإعدادات') || cmd.includes('ضبط') || cmd.includes('الضبط') || cmd.includes('سيتينج')) {
      setActiveTab('settings');
      response = lang === 'ar' ? 'تم فتح الإعدادات' : 'Switched to Settings';

    // ─── Language Switch ───────────────────────────────────────────
    } else if (cmd.includes('switch to arabic') || cmd.includes('عربي') || cmd.includes('العربية') || cmd.includes('التبديل إلى العربية') || cmd.includes('لغة عربية') || cmd.includes('غيّر اللغة') || cmd.includes('غير اللغة')) {
      response = lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to Arabic';

    } else if (cmd.includes('switch to english') || cmd.includes('إنجليزي') || cmd.includes('الإنجليزية') || cmd.includes('التبديل إلى الإنجليزية') || cmd.includes('لغة إنجليزية') || cmd.includes('english')) {
      response = lang === 'ar' ? 'تم تغيير اللغة إلى الإنجليزية' : 'Language changed to English';

    // ─── Voice Control ─────────────────────────────────────────────
    // MSA: إيقاف الصوت
    // Gulf: أوقف الصوت, اصمت
    // Egyptian: خلاص, يلا باي, بس كده, اقفل الصوت
    } else if (cmd.includes('turn off voice') || cmd.includes('إيقاف الصوت') || cmd.includes('أوقف الصوت') || cmd.includes('اصمت') || cmd.includes('اسكت') || cmd.includes('خلاص') || cmd.includes('بس كده') || cmd.includes('اقفل الصوت') || cmd.includes('سكّت')) {
      response = lang === 'ar' ? 'تم إيقاف الصوت' : 'Voice turned off';

    // ─── Alerts ────────────────────────────────────────────────────
    // MSA: تفعيل التنبيهات, كتم التنبيهات
    // Gulf: فعّل التنبيهات, شغّل التنبيهات
    // Egyptian: فعّل التنبيهات, شغّل التنبيهات, طفي التنبيهات
    } else if (cmd.includes('enable alert') || cmd.includes('تفعيل التنبيهات') || cmd.includes('فعّل التنبيهات') || cmd.includes('شغّل التنبيهات') || cmd.includes('فعّل التنبيه') || cmd.includes('شغّل التنبيه') || cmd.includes('فعّل الإشعارات')) {
      response = lang === 'ar' ? 'تم تفعيل التنبيهات' : 'Alerts enabled';

    } else if (cmd.includes('mute alert') || cmd.includes('كتم') || cmd.includes('كتم التنبيهات') || cmd.includes('أكتم التنبيهات') || cmd.includes('اكتم') || cmd.includes('أسكت التنبيهات') || cmd.includes('طفي التنبيهات') || cmd.includes('اطفي التنبيهات') || cmd.includes('سكت التنبيهات') || cmd.includes('أوقف التنبيهات')) {
      response = lang === 'ar' ? 'تم كتم التنبيهات' : 'Alerts muted';

    // ─── Drive Modes ───────────────────────────────────────────────
    // MSA: الوضع الاقتصادي, الوضع الرياضي, الوضع العادي
    // Gulf: نمط اقتصادي, توفير, سبورت
    // Egyptian: مود اقتصادي, مود رياضي, ايكو, سبورت
    } else if (cmd.includes('eco') || cmd.includes('اقتصادي') || cmd.includes('الوضع الاقتصادي') || cmd.includes('نمط اقتصادي') || cmd.includes('توفير') || cmd.includes('مود اقتصادي') || cmd.includes('ايكو') || cmd.includes('إيكو')) {
      response = lang === 'ar' ? 'تم ضبط نمط القيادة على الاقتصادي' : 'Drive mode set to Eco';

    } else if (cmd.includes('sport') || cmd.includes('رياضي') || cmd.includes('الوضع الرياضي') || cmd.includes('نمط رياضي') || cmd.includes('سبورت') || cmd.includes('مود رياضي')) {
      response = lang === 'ar' ? 'تم ضبط نمط القيادة على الرياضي' : 'Drive mode set to Sport';

    } else if (cmd.includes('normal mode') || cmd.includes('عادي') || cmd.includes('الوضع العادي') || cmd.includes('نمط عادي') || cmd.includes('مود عادي') || cmd.includes('نورمال')) {
      response = lang === 'ar' ? 'تم ضبط نمط القيادة على العادي' : 'Drive mode set to Normal';

    // ─── Export Report ─────────────────────────────────────────────
    // MSA: تصدير التقرير
    // Gulf: اصدر تقرير, اطلع تقرير
    // Egyptian: اصدر تقرير, عمل ريبورت, طلع ريبورت
    } else if (cmd.includes('export') || cmd.includes('report') || cmd.includes('تصدير') || cmd.includes('تصدير التقرير') || cmd.includes('تقرير') || cmd.includes('اصدر تقرير') || cmd.includes('اطلع تقرير') || cmd.includes('عمل ريبورت') || cmd.includes('طلع ريبورت') || cmd.includes('ريبورت')) {
      response = lang === 'ar' ? 'جارٍ تصدير التقرير' : 'Exporting report...';

    // ─── Demo Mode ─────────────────────────────────────────────────
    // MSA: بدء وضع العرض, وضع العرض
    // Gulf: وضع العرض, تجريبي
    // Egyptian: عرض تجريبي, ديمو, تشغيل ديمو
    } else if (cmd.includes('start demo') || cmd.includes('بدء العرض') || cmd.includes('وضع العرض') || cmd.includes('بدء وضع العرض') || cmd.includes('تجريبي') || cmd.includes('عرض تجريبي') || cmd.includes('ديمو') || cmd.includes('تشغيل ديمو') || cmd.includes('شغّل الديمو')) {
      response = lang === 'ar' ? 'تم بدء وضع العرض' : 'Demo mode started';

    } else if (cmd.includes('stop demo') || cmd.includes('إيقاف العرض') || cmd.includes('إيقاف وضع العرض') || cmd.includes('أوقف العرض') || cmd.includes('أوقف الديمو') || cmd.includes('قفل الديمو') || cmd.includes('اطفي الديمو')) {
      response = lang === 'ar' ? 'تم إيقاف وضع العرض' : 'Demo mode stopped';

    // ─── Adapter Connection ────────────────────────────────────────
    // MSA: اتصال بالمحوّل, قطع اتصال المحوّل
    // Gulf: وصّل, وصل المحول, اتصل بالمحول
    // Egyptian: وصل المحول, ربط, اربط المحول
    } else if (cmd.includes('connect adapter') || cmd.includes('اتصال') || cmd.includes('اتصال بالمحوّل') || cmd.includes('وصّل') || cmd.includes('وصل المحول') || cmd.includes('اتصل بالمحول') || cmd.includes('اربط') || cmd.includes('اربط المحول') || cmd.includes('ربط المحول') || cmd.includes('اشبك') || cmd.includes('شبّك المحول')) {
      response = lang === 'ar' ? 'جارٍ الاتصال بمحوّل المركبة' : 'Connecting to vehicle adapter...';

    } else if (cmd.includes('disconnect adapter') || cmd.includes('قطع اتصال') || cmd.includes('اقطع الاتصال') || cmd.includes('قطع اتصال المحوّل') || cmd.includes('افصل') || cmd.includes('افصل المحول') || cmd.includes('فكّ الربط') || cmd.includes('فك الربط') || cmd.includes('اطلع المحول') || cmd.includes('اقفل المحول')) {
      response = lang === 'ar' ? 'تم قطع الاتصال بمحوّل المركبة' : 'Disconnected from vehicle adapter';

    // ─── Read Aloud / Stop Reading ─────────────────────────────────
    // MSA: قراءة بصوت عالٍ, إيقاف القراءة
    // Gulf: اقرأ, اقرأ الصفحة
    // Egyptian: اقرألي, اقرأ الصفحة, قولي, قولي اللي في الصفحة
    } else if (cmd.includes('read aloud') || cmd.includes('قراءة') || cmd.includes('قراءة بصوت') || cmd.includes('اقرأ') || cmd.includes('اقرأ الصفحة') || cmd.includes('اقرألي') || cmd.includes('قولي') || cmd.includes('قولي اللي في الصفحة') || cmd.includes('اقرألي الصفحة')) {
      response = getPageSummary();

    // ─── Stop Reading ──────────────────────────────────────────────
    // MSA: إيقاف القراءة
    // Gulf: أوقف القراءة
    // Egyptian: بس, خلاص, يلا بس
    } else if (cmd.includes('stop reading') || cmd.includes('إيقاف القراءة') || cmd.includes('أوقف القراءة') || cmd.includes('توقف عن القراءة') || cmd.includes('بس') || cmd.includes('خلاص كده') || cmd.includes('يلا بس')) {
      response = lang === 'ar' ? 'تم إيقاف القراءة' : 'Reading stopped';

    // ─── Summarize Page ────────────────────────────────────────────
    // MSA: ملخص, ملخص الصفحة
    // Gulf: لخّص, لخص الصفحة
    // Egyptian: لخصلي, قولي ملخص, خليني افهم
    } else if (cmd.includes('summarize') || cmd.includes('ملخص') || cmd.includes('summary') || cmd.includes('صفحة') || cmd.includes('لخّص') || cmd.includes('لخص الصفحة') || cmd.includes('ملخص الصفحة') || cmd.includes('لخصلي') || cmd.includes('قولي ملخص') || cmd.includes('خليني افهم') || cmd.includes('خليني أفهم')) {
      response = getPageSummary();

    // ─── Cell Voltage ──────────────────────────────────────────────
    // MSA: جهد الخلية
    // Gulf: فولت الخلية
    // Egyptian: فولت الخلية, الفولت
    } else if (cmd.includes('cell voltage') || cmd.includes('جهد الخلية') || cmd.includes('جهود الخلايا') || cmd.includes('فولت الخلية') || cmd.includes('فولت') || cmd.includes('الفولت') || cmd.includes('الجهد')) {
      response = lang === 'ar' ? 'جهد الخلايا — يرجى الاطلاع على صفحة البطارية' : 'Cell voltages — see Battery page for details';
      setActiveTab('battery');

    // ─── Vehicle Speed ─────────────────────────────────────────────
    // MSA: السرعة
    // Gulf: السرعه, كم السرعة
    // Egyptian: السرعة, كام السرعة, بسرعة كده
    } else if (cmd.includes('speed') || cmd.includes('السرعة') || cmd.includes('السرعه') || cmd.includes('كم السرعة') || cmd.includes('كام السرعة')) {
      response = lang === 'ar'
        ? `السرعة الحالية ${vehicleData.speed.toFixed(0)} كم/س`
        : `Current speed: ${vehicleData.speed.toFixed(0)} km/h`;
      setActiveTab('dashboard');

    // ─── Temperature ───────────────────────────────────────────────
    // MSA: درجة الحرارة, الحرارة
    // Gulf: الحراره, درجة الحراره
    // Egyptian: الحرارة, درجة الحرارة, حرارة
    } else if (cmd.includes('temperature') || cmd.includes('الحرارة') || cmd.includes('الحراره') || cmd.includes('درجة الحرارة') || cmd.includes('درجة الحراره') || cmd.includes('حرارة') || cmd.includes('حراره')) {
      response = lang === 'ar'
        ? `درجة حرارة المحرك ${vehicleData.motorTemp.toFixed(0)}°م`
        : `Motor temperature: ${vehicleData.motorTemp.toFixed(0)}°C`;
      setActiveTab('dashboard');

    // ─── Voice Help ────────────────────────────────────────────────
    // MSA: مساعدة صوتية
    // Gulf: مساعدة, ايش الأوامر
    // Egyptian: مساعدة, الأوامر إيه, إيه الأوامر
    } else if (cmd.includes('help') || cmd.includes('مساعدة') || cmd.includes('مساعدة صوتية') || cmd.includes('الأوامر') || cmd.includes('ما الأوامر') || cmd.includes('شو الأوامر') || cmd.includes('ايش الأوامر') || cmd.includes('إيه الأوامر') || cmd.includes('الأوامر إيه') || cmd.includes('اوامر')) {
      response = lang === 'ar'
        ? 'الأوامر المتاحة: بطارية، مدى، محرك، أعطال، لوحة القيادة، الشحن، الرحلات، الصيانة، الإعدادات، ملخص، سرعة، حرارة، مساعدة'
        : 'Available commands: battery, range, motor, faults, dashboard, charging, sessions, maintenance, settings, summarize, speed, temperature, help';

    // ─── Fallback ──────────────────────────────────────────────────
    } else {
      response = lang === 'ar' ? 'لم أفهم، حاول مرة أخرى' : "Didn't catch that. Try again.";
    }

    setFeedbackText(response);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 5000);

    // Speak the response via TTS
    speakText(response);
  }, [lang, vehicleData, dtcs, setActiveTab, getPageSummary]);

  const speakText = useCallback(async (text: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      // Format speech with natural pauses, spelled-out DTCs, and severity-based prosody
      const { text: formattedText, rate, pitch } = formatCommandResponse(text, lang);
      await TextToSpeech.speak({
        text: formattedText,
        lang: lang === 'ar' ? 'ar-SA' : 'en-US',
        rate,
        pitch,
      });
    } catch (error) {
      console.warn('TTS not available:', error);
    }
  }, [lang]);

  const toggleListening = useCallback(async () => {
    if (voiceListening) {
      // Stop speech recognition and clean up listeners
      setVoiceListening(false);
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
      } catch {}
      // Remove all stored listeners
      for (const handle of listenerHandlesRef.current) {
        try { await handle.remove(); } catch {}
      }
      listenerHandlesRef.current = [];
      return;
    }

    // Use Capacitor Speech Recognition on native, Web Speech API as fallback
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');

        // Check availability
        const available = await SpeechRecognition.available();
        if (!available.available) {
          setFeedbackText(lang === 'ar' ? 'التعرف على الكلام غير متاح' : 'Speech recognition not available');
          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 3000);
          return;
        }

        // Request permission
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== 'granted') {
          setFeedbackText(lang === 'ar' ? 'يرجى منح إذن الميكروفون' : 'Please grant microphone permission');
          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 3000);
          return;
        }

        setVoiceListening(true);

        // Set up listener BEFORE starting — partialResults captures both
        // partial and final results; we process only once via processingRef
        const handle1 = await SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0 && !processingRef.current) {
            processingRef.current = true;
            const transcript = data.matches[0];
            setLastTranscript(transcript);
            processCommand(transcript);
            setVoiceListening(false);
            processingRef.current = false;
          }
        });
        listenerHandlesRef.current.push(handle1);

        // Listen for state changes to detect when recognition ends
        const handle2 = await SpeechRecognition.addListener('listeningState', (data: any) => {
          if (data.status === 'stopped') {
            setVoiceListening(false);
          }
        });
        listenerHandlesRef.current.push(handle2);

        // Start listening with partialResults: true so the listener fires
        await SpeechRecognition.start({
          language: lang === 'ar' ? 'ar-SA' : 'en-US',
          partialResults: true,
          popup: false,
        });
      } catch (error) {
        console.error('Speech recognition error:', error);
        setFeedbackText(lang === 'ar' ? 'خطأ في التعرف على الكلام' : 'Speech recognition error');
        setShowFeedback(true);
        setVoiceListening(false);
        setTimeout(() => setShowFeedback(false), 3000);
      }
    } else {
      // Web fallback
      const SpeechRecognitionClass = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        setFeedbackText(lang === 'ar' ? 'التعرف على الكلام غير متاح' : 'Voice not available in this browser');
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 3000);
        return;
      }

      interface SRInstance {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: any) => void;
        onerror: (event: any) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      }

      const recognition = new (SpeechRecognitionClass as new () => SRInstance)() as SRInstance;
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLastTranscript(transcript);
        processCommand(transcript);
        setVoiceListening(false);
      };

      recognition.onerror = () => {
        setVoiceListening(false);
      };

      recognition.onend = () => {
        setVoiceListening(false);
      };

      recognition.start();
      setVoiceListening(true);
    }
  }, [voiceListening, lang, setVoiceListening, processCommand]);

  const handleSummarizePage = useCallback(() => {
    const summary = getPageSummary();
    setFeedbackText(summary);
    setShowSummary(true);
    setShowFeedback(true);
    speakText(summary);
    setTimeout(() => {
      setShowFeedback(false);
      setShowSummary(false);
    }, 6000);
  }, [getPageSummary, speakText]);

  return (
    <>
      {/* Floating Voice Assistant — visible on all screens */}
      <div className={`fixed z-50 flex flex-col gap-2 ${settings.language === 'ar' ? 'left-4' : 'right-4'}`} style={{ bottom: '76px' }}>
        {/* Summarize Page Button */}
        <motion.button
          onClick={handleSummarizePage}
          className="w-11 h-11 rounded-full bg-evdx-purple/80 hover:bg-evdx-purple flex items-center justify-center shadow-lg shadow-evdx-purple/20 transition-colors"
          whileTap={{ scale: 0.9 }}
          aria-label={lang === 'ar' ? 'تلخيص الصفحة' : 'Summarize page'}
        >
          <Sparkles size={18} className="text-white" />
        </motion.button>

        {/* Mic Button */}
        <motion.button
          onClick={toggleListening}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            voiceListening
              ? 'bg-evdx-critical shadow-evdx-critical/30 animate-voice-pulse'
              : 'bg-evdx-primary shadow-evdx-primary/20 hover:bg-evdx-primary/90'
          }`}
          whileTap={{ scale: 0.9 }}
          aria-label={voiceListening ? t('listening') : t('tapToActivate')}
        >
          {voiceListening ? (
            <MicOff size={22} className="text-white" />
          ) : (
            <Mic size={22} className="text-[#0D1117]" />
          )}
        </motion.button>
      </div>

      {/* Voice Feedback Overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-32 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className={`border rounded-2xl p-4 shadow-xl flex items-start gap-3 ${
              showSummary
                ? 'bg-evdx-purple/20 border-evdx-purple/30'
                : 'bg-[#1A2332] border-white/10'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                showSummary ? 'bg-evdx-purple/20' : 'bg-evdx-primary/10'
              }`}>
                {showSummary ? (
                  <Sparkles size={16} className="text-evdx-purple" />
                ) : (
                  <Volume2 size={16} className="text-evdx-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium mb-0.5 ${
                  showSummary ? 'text-evdx-purple' : 'text-evdx-primary'
                }`}>
                  {showSummary
                    ? (lang === 'ar' ? 'ملخص الصفحة' : 'Page Summary')
                    : t('assistantName')
                  }
                </p>
                <p className="text-sm text-evdx-text leading-relaxed">{feedbackText}</p>
                {lastTranscript && !showSummary && (
                  <p className="text-xs text-evdx-text-secondary mt-1 italic">&ldquo;{lastTranscript}&rdquo;</p>
                )}
              </div>
              <button onClick={() => setShowFeedback(false)} className="text-evdx-text-secondary hover:text-evdx-text shrink-0">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening Indicator */}
      <AnimatePresence>
        {voiceListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className="bg-evdx-critical/10 border border-evdx-critical/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-evdx-critical rounded-full"
                    animate={{ height: [8, 20, 8] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm text-evdx-critical font-medium">{t('speakNow')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
