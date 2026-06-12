'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface SpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function VoiceAssistant() {
  const { t } = useTranslation('voice');
  const { voiceListening, setVoiceListening, settings, setActiveTab, vehicleData, dtcs } = useAppStore();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processingRef = useRef(false);

  const processCommand = (transcript: string) => {
    const cmd = transcript.toLowerCase().trim();
    let response = '';

    if (cmd.includes('battery') || cmd.includes('بطارية')) {
      response = t('responses.batteryAt', { percent: vehicleData.soc });
      setActiveTab('battery');
    } else if (cmd.includes('range') || cmd.includes('مدى')) {
      response = t('responses.rangeRemaining', { range: vehicleData.range });
    } else if (cmd.includes('motor') || cmd.includes('محرك')) {
      response = t('responses.motorTempIs', { temp: vehicleData.motorTemp });
    } else if (cmd.includes('fault') || cmd.includes('scan') || cmd.includes('أعطال')) {
      if (dtcs.length > 0) {
        response = t('responses.faultsFound', { count: dtcs.length });
      } else {
        response = t('responses.noFaultsFound');
      }
      setActiveTab('diagnostics');
    } else if (cmd.includes('dashboard') || cmd.includes('لوحة')) {
      setActiveTab('dashboard');
      response = t('responses.commandExecuted');
    } else if (cmd.includes('charging') || cmd.includes('شحن')) {
      setActiveTab('charging');
      response = t('responses.commandExecuted');
    } else if (cmd.includes('setting') || cmd.includes('إعدادات')) {
      setActiveTab('settings');
      response = t('responses.commandExecuted');
    } else {
      response = t('responses.cannotUnderstand');
    }

    setFeedbackText(response);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 4000);
  };

  const toggleListening = () => {
    if (!settings.voiceAssistant) return;

    if (voiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setVoiceListening(false);
      return;
    }

    const SpeechRecognitionClass = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setFeedbackText(t('voiceNotAvailable'));
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
      return;
    }

    const recognition = new (SpeechRecognitionClass as new () => SpeechRecognition)() as SpeechRecognition;
    recognition.lang = settings.language === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceListening(true);
  };

  // Proactive alerts - derived from vehicle data
  const lowBatteryAlert = settings.voiceAssistant && vehicleData.soc > 0 && vehicleData.soc < 15;

  if (!settings.voiceAssistant) return null;

  return (
    <>
      {/* Floating Mic Button */}
      <motion.button
        onClick={toggleListening}
        className={`fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          voiceListening
            ? 'bg-evdx-critical animate-voice-pulse'
            : 'bg-evdx-primary hover:bg-evdx-primary/90'
        }`}
        whileTap={{ scale: 0.9 }}
        aria-label={voiceListening ? t('listening') : t('tapToActivate')}
      >
        {voiceListening ? (
          <MicOff size={24} className="text-white" />
        ) : (
          <Mic size={24} className="text-[#0D1117]" />
        )}
      </motion.button>

      {/* Voice Feedback Overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 left-4 right-4 z-40 max-w-md mx-auto"
          >
            <div className="bg-[#1A2332] border border-white/10 rounded-2xl p-4 shadow-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-evdx-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 size={16} className="text-evdx-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-evdx-primary font-medium mb-0.5">{t('assistantName')}</p>
                <p className="text-sm text-evdx-text">{feedbackText}</p>
                {lastTranscript && (
                  <p className="text-xs text-evdx-text-secondary mt-1 italic">&ldquo;{lastTranscript}&rdquo;</p>
                )}
              </div>
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
            className="fixed bottom-36 left-4 right-4 z-40 max-w-md mx-auto"
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
