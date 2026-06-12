'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AnimatedNumber } from '@/components/shared/Gauges';
import { Wrench, Plus, Trash2, Calendar, Gauge, DollarSign, FileText, Clock } from 'lucide-react';
import type { MaintenanceType } from '@/lib/types';

const SERVICE_TYPES: { id: MaintenanceType; icon: string }[] = [
  { id: 'tire_rotation', icon: '🔄' },
  { id: 'brake_inspection', icon: '🛑' },
  { id: 'coolant_flush', icon: '💧' },
  { id: 'cabin_filter', icon: '🌬️' },
  { id: 'battery_health', icon: '🔋' },
  { id: 'software_update', icon: '💻' },
  { id: 'other', icon: '🔧' },
];

export default function MaintenanceView() {
  const { t } = useTranslation('maintenance');
  const { maintenanceEntries, addMaintenanceEntry, removeMaintenanceEntry, vehicleData } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<MaintenanceType>('tire_rotation');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formOdometer, setFormOdometer] = useState(String(Math.round(vehicleData.odometer)));
  const [formCost, setFormCost] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleSubmit = () => {
    addMaintenanceEntry({
      id: `maint-${Date.now()}`,
      vehicleId: 'default',
      type: formType,
      description: t(`items.${formType}`) || formType,
      date: new Date(formDate).getTime(),
      odometer: Number(formOdometer),
      cost: Number(formCost) || 0,
      notes: formNotes,
      nextDueOdometer: Number(formOdometer) + 10000,
    });
    setShowForm(false);
    setFormCost('');
    setFormNotes('');
  };

  const totalCost = maintenanceEntries.reduce((sum, e) => sum + e.cost, 0);

  const nextServiceDue = maintenanceEntries.length > 0
    ? Math.min(...maintenanceEntries.filter((e) => e.nextDueOdometer).map((e) => e.nextDueOdometer || Infinity))
    : vehicleData.odometer + 10000;

  const kmUntilService = Math.max(0, nextServiceDue - vehicleData.odometer);

  return (
    <div className="space-y-4 pb-2">
      {/* Next Service Reminder */}
      <Card className={`border-2 ${kmUntilService < 1000 ? 'border-evdx-critical/30' : kmUntilService < 5000 ? 'border-evdx-warning/30' : 'border-evdx-green/20'} bg-[#1A2332]`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              kmUntilService < 1000 ? 'bg-evdx-critical/10' : kmUntilService < 5000 ? 'bg-evdx-warning/10' : 'bg-evdx-green/10'
            }`}>
              <Clock size={24} className={
                kmUntilService < 1000 ? 'text-evdx-critical' : kmUntilService < 5000 ? 'text-evdx-warning' : 'text-evdx-green'
              } />
            </div>
            <div>
              <p className="text-sm text-evdx-text-secondary">{t('nextServiceDue')}</p>
              <p className={`text-xl font-bold tabular-nums ${
                kmUntilService < 1000 ? 'text-evdx-critical' : kmUntilService < 5000 ? 'text-evdx-warning' : 'text-evdx-green'
              }`}>
                <AnimatedNumber value={kmUntilService} decimals={0} suffix=" km" />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Service Button */}
      <Button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold h-12 rounded-xl"
      >
        <Plus size={18} className="mr-2" />
        {t('addService')}
      </Button>

      {/* Add Service Form */}
      {showForm && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-evdx-text">{t('addService')}</p>

            <div>
              <label className="text-xs text-evdx-text-secondary mb-1 block">{t('serviceType')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SERVICE_TYPES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFormType(st.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                      formType === st.id
                        ? 'bg-evdx-primary/20 border border-evdx-primary/30 text-evdx-primary'
                        : 'bg-[#0D1117] border border-white/5 text-evdx-text-secondary hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg">{st.icon}</span>
                    <span className="truncate w-full text-center text-[10px]">{t(`items.${st.id}`) || st.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-evdx-text-secondary mb-1 block">{t('serviceDate')}</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-[#0D1117] border-white/10 text-evdx-text text-sm h-10"
                />
              </div>
              <div>
                <label className="text-xs text-evdx-text-secondary mb-1 block">{t('mileage')}</label>
                <Input
                  type="number"
                  value={formOdometer}
                  onChange={(e) => setFormOdometer(e.target.value)}
                  placeholder="km"
                  className="bg-[#0D1117] border-white/10 text-evdx-text text-sm h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-evdx-text-secondary mb-1 block">{t('cost')} (OMR)</label>
              <Input
                type="number"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                placeholder="0.000"
                className="bg-[#0D1117] border-white/10 text-evdx-text text-sm h-10"
              />
            </div>

            <div>
              <label className="text-xs text-evdx-text-secondary mb-1 block">{t('notes')}</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
                className="bg-[#0D1117] border-white/10 text-evdx-text text-sm h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowForm(false)}
                variant="outline"
                className="flex-1 border-white/10 text-evdx-text h-10"
              >
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] h-10"
              >
                {t('save', { ns: 'common' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Log */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-evdx-primary" />
              <span className="text-sm font-medium text-evdx-text">{t('serviceLog')}</span>
            </div>
            <Badge variant="outline" className="text-xs text-evdx-text-secondary border-white/10">
              {maintenanceEntries.length} entries
            </Badge>
          </div>

          {maintenanceEntries.length === 0 ? (
            <div className="text-center py-8">
              <Wrench size={32} className="text-evdx-text-secondary/30 mx-auto mb-2" />
              <p className="text-sm text-evdx-text-secondary">{t('noServiceHistory')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {maintenanceEntries
                .sort((a, b) => b.date - a.date)
                .map((entry) => (
                  <div key={entry.id} className="bg-[#0D1117] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-evdx-text">{entry.description}</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-evdx-text-secondary hover:text-evdx-critical p-1">
                            <Trash2 size={14} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1A2332] border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-evdx-text">{t('deleteService')}</AlertDialogTitle>
                            <AlertDialogDescription className="text-evdx-text-secondary">
                              {t('deleteServiceConfirm')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#0D1117] text-evdx-text border-white/10">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMaintenanceEntry(entry.id)} className="bg-evdx-critical text-white">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-evdx-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge size={10} />
                        {entry.odometer.toLocaleString()} km
                      </span>
                      {entry.cost > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={10} />
                          {entry.cost.toFixed(3)} OMR
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-evdx-text-secondary mt-1 flex items-center gap-1">
                        <FileText size={10} />
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {maintenanceEntries.length > 0 && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-evdx-green" />
              <span className="text-sm font-medium text-evdx-text">{t('totalServiceCost')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0D1117] rounded-lg p-3 text-center">
                <p className="text-xs text-evdx-text-secondary">{t('totalCost')}</p>
                <p className="text-lg font-bold text-evdx-text tabular-nums">
                  <AnimatedNumber value={totalCost} decimals={3} suffix=" OMR" />
                </p>
              </div>
              <div className="bg-[#0D1117] rounded-lg p-3 text-center">
                <p className="text-xs text-evdx-text-secondary">{t('averageCostPerService')}</p>
                <p className="text-lg font-bold text-evdx-text tabular-nums">
                  <AnimatedNumber value={maintenanceEntries.length > 0 ? totalCost / maintenanceEntries.length : 0} decimals={3} suffix=" OMR" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
