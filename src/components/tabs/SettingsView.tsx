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
import { Globe, Volume2, Moon, Shield, Trash2, Download, Info, ChevronRight, Thermometer, Zap, MapPin } from 'lucide-react';

export default function SettingsView() {
  const { t, i18n } = useTranslation('settings');
  const { settings, updateSettings, disconnect } = useAppStore();
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

      {/* Voice Assistant */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-evdx-purple" />
            <span className="text-sm font-medium text-evdx-text">{t('voice')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">Voice Assistant</p>
              <p className="text-xs text-evdx-text-secondary">Enable voice commands & alerts</p>
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
                <span className="text-sm text-evdx-text">Low Battery %</span>
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
                <span className="text-sm text-evdx-text">High Temp °C</span>
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
                <span className="text-sm text-evdx-text">Low Range km</span>
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
              <p className="text-sm text-evdx-text">{t('highContrast')}</p>
              <p className="text-xs text-evdx-text-secondary">{t('highContrastDescription')}</p>
            </div>
            <Switch
              checked={false}
              onCheckedChange={() => {}}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">Temperature Unit</p>
              <p className="text-xs text-evdx-text-secondary">Celsius or Fahrenheit</p>
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
              <p className="text-sm text-evdx-text">Distance Unit</p>
              <p className="text-xs text-evdx-text-secondary">Kilometers or Miles</p>
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

      {/* Security */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-evdx-green" />
            <span className="text-sm font-medium text-evdx-text">{t('security')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">{t('autoWipe')}</p>
              <p className="text-xs text-evdx-text-secondary">{t('autoWipeDescription')}</p>
            </div>
            <Switch
              checked={false}
              onCheckedChange={() => {}}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-evdx-text">Electricity Rate</p>
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

      {/* About */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('aboutApp')}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{t('appVersion')}</span>
              <span className="text-sm text-evdx-text">1.0.0</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">{t('author', { ns: 'common' })}</span>
              <span className="text-sm text-evdx-text">Dr. Waleed Mandour</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
              <span className="text-xs text-evdx-text-secondary">Email</span>
              <span className="text-sm text-evdx-primary">waleedmandour@gmail.com</span>
            </div>
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
                <AlertDialogCancel className="bg-[#0D1117] text-evdx-text border-white/10">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllData} className="bg-evdx-critical text-white">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-evdx-green" />
            <div>
              <p className="text-sm font-medium text-evdx-text">{t('privacyPolicy')}</p>
              <p className="text-xs text-evdx-text-secondary">All data stored locally. Never shared.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
