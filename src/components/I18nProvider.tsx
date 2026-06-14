'use client';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language;
    const isRTL = lang === 'ar';

    // Set document-level direction and language for proper RTL support
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [i18n.language]);

  return <>{children}</>;
}
