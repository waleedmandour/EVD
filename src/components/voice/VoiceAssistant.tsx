'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Capacitor } from '@capacitor/core';
import { Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react';

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

    if (cmd.includes('battery') || cmd.includes('بطارية')) {
      response = lang === 'ar'
        ? `شحن البطارية ${vehicleData.soc.toFixed(0)}%، الصحة ${vehicleData.soh.toFixed(0)}%`
        : `Battery at ${vehicleData.soc.toFixed(0)}%, Health ${vehicleData.soh.toFixed(0)}%`;
      setActiveTab('battery');
    } else if (cmd.includes('range') || cmd.includes('مدى')) {
      response = lang === 'ar'
        ? `المدى المتبقي ${vehicleData.range.toFixed(0)} كم`
        : `Range remaining: ${vehicleData.range.toFixed(0)} km`;
    } else if (cmd.includes('motor') || cmd.includes('محرك')) {
      response = lang === 'ar'
        ? `درجة حرارة المحرك ${vehicleData.motorTemp.toFixed(0)} درجة مئوية`
        : `Motor temperature: ${vehicleData.motorTemp.toFixed(0)}°C`;
      setActiveTab('dashboard');
    } else if (cmd.includes('fault') || cmd.includes('scan') || cmd.includes('أعطال') || cmd.includes('فحص')) {
      if (dtcs.length > 0) {
        response = lang === 'ar'
          ? `تم العثور على ${dtcs.length} رمز عطل`
          : `Found ${dtcs.length} fault code(s)`;
      } else {
        response = lang === 'ar' ? 'لا توجد أعطال' : 'No faults found';
      }
      setActiveTab('diagnostics');
    } else if (cmd.includes('dashboard') || cmd.includes('لوحة')) {
      setActiveTab('dashboard');
      response = lang === 'ar' ? 'تم فتح لوحة القيادة' : 'Switched to Dashboard';
    } else if (cmd.includes('charging') || cmd.includes('شحن')) {
      setActiveTab('charging');
      response = lang === 'ar' ? 'تم فتح صفحة الشحن' : 'Switched to Charging';
    } else if (cmd.includes('setting') || cmd.includes('إعداد')) {
      setActiveTab('settings');
      response = lang === 'ar' ? 'تم فتح الإعدادات' : 'Switched to Settings';
    } else if (cmd.includes('summarize') || cmd.includes('ملخص') || cmd.includes('summary') || cmd.includes('صفحة')) {
      response = getPageSummary();
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
      await TextToSpeech.speak({
        text,
        lang: lang === 'ar' ? 'ar-SA' : 'en-US',
        rate: 1.0,
        pitch: 1.0,
      });
    } catch (error) {
      console.warn('TTS not available:', error);
    }
  }, [lang]);

  const toggleListening = useCallback(async () => {
    if (voiceListening) {
      setVoiceListening(false);
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

        // Start listening
        await SpeechRecognition.start({
          language: lang === 'ar' ? 'ar-SA' : 'en-US',
          partialResults: false,
          popup: false,
        });

        // Listen for results
        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0 && !processingRef.current) {
            processingRef.current = true;
            const transcript = data.matches[0];
            setLastTranscript(transcript);
            processCommand(transcript);
            setVoiceListening(false);
            processingRef.current = false;
          }
        });

        SpeechRecognition.addListener('end', () => {
          setVoiceListening(false);
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
