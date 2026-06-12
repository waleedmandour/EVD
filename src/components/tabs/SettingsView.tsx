'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Globe, Volume2, Moon, Shield, Trash2, Download, Info, ChevronRight, Thermometer, Zap, MapPin, ExternalLink, Heart, Brain, Leaf } from 'lucide-react';

export default function SettingsView() {
  const { t, i18n } = useTranslation('settings');
  const { settings, updateSettings, disconnect, setActiveTab } = useAppStore();
  const [lowBattery, setLowBattery] = useState(String(20));
  const [highTemp, setHighTemp] = useState(String(80));
  const [lowRange, setLowRange] = useState(String(50));

  const handleLanguageToggle = () => {
    const newLang = settings.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    updateSettings({ language: newLang });
  };

  const handleDeleteAllData = () => {
    localStorage.removeItem('evdx-store');
    window.location.reload();
  };

  const handleExportData = () => {
    const data = localStorage.getItem('evdx-store');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'evdx-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isRTL = settings.language === 'ar';

  return (
    <div className="space-y-4 pb-2">
      {/* Language */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-evdx-primary/10 flex items-center justify-center">
                <Globe size={18} className="text-evdx-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-evdx-text">{t('language')}</p>
                <p className="text-xs text-evdx-text-secondary">
                  {settings.language === 'en' ? 'English' : 'العربية'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLanguageToggle}
              variant="outline"
              className="border-white/10 text-evdx-text hover:bg-white/5 h-9"
            >
              {settings.language === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card className="bg-[#1A2332] border-evdx-purple/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-evdx-purple" />
            <span className="text-sm font-medium text-evdx-text">
              {isRTL ? 'ميزات الذكاء الاصطناعي' : 'AI Features'}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('aiBattery')}
            className="w-full flex items-center justify-between bg-[#0D1117] hover:bg-evdx-purple/5 rounded-lg px-3 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-evdx-purple/10 flex items-center justify-center">
                <Brain size={14} className="text-evdx-purple" />
              </div>
              <div className="text-left">
                <p className="text-sm text-evdx-text">{isRTL ? 'التنبؤ بصحة البطارية' : 'Battery Health Predictor'}</p>
                <p className="text-xs text-evdx-text-secondary">{isRTL ? 'توقعات التدهور والتوصيات' : 'Degradation forecast & tips'}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-evdx-text-secondary" />
          </button>

          <button
            onClick={() => setActiveTab('aiDtc')}
            className="w-full flex items-center justify-between bg-[#0D1117] hover:bg-evdx-purple/5 rounded-lg px-3 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-evdx-critical/10 flex items-center justify-center">
                <Shield size={14} className="text-evdx-critical" />
              </div>
              <div className="text-left">
                <p className="text-sm text-evdx-text">{isRTL ? 'محلل الأعطال الذكي' : 'Smart DTC Analyzer'}</p>
                <p className="text-xs text-evdx-text-secondary">{isRTL ? 'تحليل السبب الجذري بالذكاء الاصطناعي' : 'AI root cause analysis'}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-evdx-text-secondary" />
          </button>

          <button
            onClick={() => setActiveTab('aiCoach')}
            className="w-full flex items-center justify-between bg-[#0D1117] hover:bg-evdx-purple/5 rounded-lg px-3 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-evdx-green/10 flex items-center justify-center">
                <Leaf size={14} className="text-evdx-green" />
              </div>
              <div className="text-left">
                <p className="text-sm text-evdx-text">{isRTL ? 'مدرب القيادة الاقتصادية' : 'Eco-Driving Coach'}</p>
                <p className="text-xs text-evdx-text-secondary">{isRTL ? 'نصائح مخصصة لتحسين المدى' : 'Personalized range tips'}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-evdx-text-secondary" />
          </button>
        </CardContent>
      </Card>

      {/* Voice Assistant */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-evdx-purple" />
            <span className="text-sm font-medium text-evdx-text">{t('voice')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{isRTL ? 'مساعد الصوت' : 'Voice Assistant'}</p>
              <p className="text-xs text-evdx-text-secondary">{isRTL ? 'تمكين الأوامر والتنبيهات الصوتية' : 'Enable voice commands & alerts'}</p>
            </div>
            <Switch
              checked={settings.voiceAssistant}
              onCheckedChange={(checked) => updateSettings({ voiceAssistant: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{t('quietHours')}</p>
              <p className="text-xs text-evdx-text-secondary">{t('quietHoursDescription')}</p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSettings({ notifications: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-evdx-warning" />
            <span className="text-sm font-medium text-evdx-text">{t('alertThresholds')}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-evdx-critical" />
                <span className="text-sm text-evdx-text">{isRTL ? 'بطارية منخفضة %' : 'Low Battery %'}</span>
              </div>
              <Input
                type="number"
                value={lowBattery}
                onChange={(e) => setLowBattery(e.target.value)}
                className="w-20 bg-[#0D1117] border-white/10 text-evdx-text text-sm h-8"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer size={14} className="text-evdx-warning" />
                <span className="text-sm text-evdx-text">{isRTL ? 'حرارة عالية °م' : 'High Temp °C'}</span>
              </div>
              <Input
                type="number"
                value={highTemp}
                onChange={(e) => setHighTemp(e.target.value)}
                className="w-20 bg-[#0D1117] border-white/10 text-evdx-text text-sm h-8"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-evdx-primary" />
                <span className="text-sm text-evdx-text">{isRTL ? 'مدى منخفض كم' : 'Low Range km'}</span>
              </div>
              <Input
                type="number"
                value={lowRange}
                onChange={(e) => setLowRange(e.target.value)}
                className="w-20 bg-[#0D1117] border-white/10 text-evdx-text text-sm h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('display')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{isRTL ? 'وحدة الحرارة' : 'Temperature Unit'}</p>
              <p className="text-xs text-evdx-text-secondary">{isRTL ? 'مئوية أو فهرنهايت' : 'Celsius or Fahrenheit'}</p>
            </div>
            <Button
              onClick={() => updateSettings({ temperatureUnit: settings.temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius' })}
              variant="outline"
              className="border-white/10 text-evdx-text hover:bg-white/5 h-8 text-xs"
            >
              {settings.temperatureUnit === 'celsius' ? '°F' : '°C'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{isRTL ? 'وحدة المسافة' : 'Distance Unit'}</p>
              <p className="text-xs text-evdx-text-secondary">{isRTL ? 'كيلومتر أو ميل' : 'Kilometers or Miles'}</p>
            </div>
            <Button
              onClick={() => updateSettings({ distanceUnit: settings.distanceUnit === 'km' ? 'miles' : 'km' })}
              variant="outline"
              className="border-white/10 text-evdx-text hover:bg-white/5 h-8 text-xs"
            >
              {settings.distanceUnit === 'km' ? 'mi' : 'km'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security & Cost */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-evdx-green" />
            <span className="text-sm font-medium text-evdx-text">{t('security')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{isRTL ? 'سعر الكهرباء' : 'Electricity Rate'}</p>
              <p className="text-xs text-evdx-text-secondary">{settings.electricityCostPerKwh} OMR/kWh</p>
            </div>
            <Input
              type="number"
              value={String(settings.electricityCostPerKwh)}
              onChange={(e) => updateSettings({ electricityCostPerKwh: Number(e.target.value) })}
              className="w-24 bg-[#0D1117] border-white/10 text-evdx-text text-sm h-8"
              step="0.001"
            />
          </div>
        </CardContent>
      </Card>

      {/* About - Dr. Waleed Mandour */}
      <Card className="bg-[#1A2332] border-evdx-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('aboutApp')}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{t('appVersion')}</span>
              <span className="text-sm text-evdx-text">1.1.0</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{isRTL ? 'المؤلف' : 'Author'}</span>
              <span className="text-sm text-evdx-text font-medium">Dr. Waleed Mandour</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{isRTL ? 'البريد الإلكتروني' : 'Email'}</span>
              <span className="text-sm text-evdx-primary">waleedmandour@gmail.com</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{isRTL ? 'الترخيص' : 'License'}</span>
              <span className="text-sm text-evdx-text">&copy; 2026 Dr. Waleed Mandour</span>
            </div>
          </div>

          <a
            href="https://github.com/waleedmandour/EVD"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-gradient-to-r from-evdx-primary/10 to-evdx-purple/10 border border-evdx-primary/20 rounded-lg px-3 py-3 hover:from-evdx-primary/15 hover:to-evdx-purple/15 transition-all"
          >
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-evdx-text">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-sm text-evdx-text font-medium">GitHub Repository</span>
            </div>
            <ExternalLink size={16} className="text-evdx-primary" />
          </a>

          <div className="text-center pt-2">
            <p className="text-[10px] text-evdx-text-secondary flex items-center justify-center gap-1">
              Made with <Heart size={10} className="text-evdx-critical fill-evdx-critical" /> in Oman
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <span className="text-sm font-medium text-evdx-text">{t('dataManagement')}</span>

          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full border-white/10 text-evdx-text hover:bg-white/5 h-11"
          >
            <Download size={16} className="mr-2" />
            {t('exportAllData')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-evdx-critical/30 text-evdx-critical hover:bg-evdx-critical/10 h-11"
              >
                <Trash2 size={16} className="mr-2" />
                {t('deleteAllData')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1A2332] border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-evdx-text">{t('deleteAllData')}</AlertDialogTitle>
                <AlertDialogDescription className="text-evdx-text-secondary">
                  {t('deleteAllDataConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-[#0D1117] text-evdx-text border-white/10">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllData} className="bg-evdx-critical text-white">
                  {isRTL ? 'حذف' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-[#1A2332] border-evdx-green/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-evdx-green" />
            <div>
              <p className="text-sm font-medium text-evdx-text">{t('privacyPolicy')}</p>
              <p className="text-xs text-evdx-text-secondary">
                {isRTL
                  ? 'جميع البيانات مخزنة محلياً. لا يتم مشاركتها أبداً. صفر بيانات تتبع.'
                  : 'All data stored locally. Never shared. Zero telemetry.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
