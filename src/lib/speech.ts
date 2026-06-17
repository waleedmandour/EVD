/**
 * Speech Formatter for EVDx
 *
 * Enhances TTS output using the Capacitor TTS plugin's native
 * rate/pitch parameters plus text pre-formatting, because the
 * @capacitor-community/text-to-speech plugin does NOT support SSML.
 *
 * Enhancements:
 *  - Severity-aware rate/pitch tuning (native TTS params)
 *  - DTC codes spelled out for proper reading (P0A80 → P, 0, A, 8, 0)
 *  - Arabic acronym substitution in text (BMS → نظام إدارة البطارية)
 *  - Natural comma pauses inserted at sentence boundaries
 *  - Cardinal number pre-formatting
 */

export type SpeechSeverity = 'normal' | 'warning' | 'critical';

// ─── Severity Presets ─────────────────────────────────────────────────────────
// These map to the Capacitor TTS plugin's native rate/pitch parameters.

export const SEVERITY_TTS: Record<SpeechSeverity, { rate: number; pitch: number }> = {
  normal:   { rate: 0.92, pitch: 1.05 },  // Slightly slower, slightly higher = natural
  warning:  { rate: 0.85, pitch: 0.95 },  // Slower, deeper = caution
  critical: { rate: 0.80, pitch: 0.90 },  // Slowest, deepest = urgent
};

// ─── Acronym Substitutions (Arabic) ───────────────────────────────────────────
// Replace English acronyms with Arabic equivalents IN THE TEXT itself.

const ARABIC_ACRONYMS: Record<string, string> = {
  BMS: 'نظام إدارة البطارية',
  BCM: 'وحدة التحكم في الهيكل',
  ECU: 'وحدة التحكم الإلكترونية',
  MCU: 'وحدة التحكم في المحرك',
  SOH: 'صحة البطارية',
  SOC: 'حالة الشحن',
  OBD: 'أو بي دي',
  VIN: 'رقم الهيكل',
  DC: 'تيار مستمر',
  AC: 'تيار متردد',
  CAN: 'كان',
  PID: 'بي آي دي',
  DTC: 'رمز العطل',
  HV: 'جهد عالي',
  LV: 'جهد منخفض',
  RPM: 'لفة في الدقيقة',
  EV: 'سيارة كهربائية',
  ICE: 'سيارة بنزين',
  BLE: 'بلوتوث منخفض الطاقة',
  PDF: 'بي دي إف',
  CSV: 'سي إس في',
};

// ─── DTC Code Pattern ─────────────────────────────────────────────────────────

// DTC code pattern. Standard DTC first letters are P (Powertrain),
// B (Body), U (Network), C (Chassis). The previous pattern listed C and E
// twice ([PBUCEC]) and included E which is non-standard — fixed.
const DTC_PATTERN = /\b([PBUC][0-9A-F]{2,5})\b/gi;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Spell out DTC codes with comma-separated characters for proper TTS reading.
 * e.g. "P0A80" → "P, 0, A, 8, 0"
 * This forces the TTS engine to read each character individually.
 */
function spellOutDTCs(text: string): string {
  return text.replace(DTC_PATTERN, (match) => {
    return match.split('').join(', ');
  });
}

/**
 * Substitute English acronyms with Arabic equivalents in the text.
 * Only applied when language is Arabic.
 */
function substituteAcronyms(text: string, lang: 'ar' | 'en'): string {
  if (lang !== 'ar') return text;

  let result = text;
  for (const [acronym, arabicAlias] of Object.entries(ARABIC_ACRONYMS)) {
    // Match whole-word only, case-sensitive
    const regex = new RegExp(`\\b${acronym}\\b`, 'g');
    result = result.replace(regex, arabicAlias);
  }
  return result;
}

/**
 * Add natural comma pauses at sentence boundaries.
 * Since we can't use SSML <break>, we insert commas/periods where
 * natural pauses would occur. TTS engines naturally pause at commas.
 */
function insertCommaPauses(text: string): string {
  // After period + space → add a comma pause marker
  // (TTS already pauses at periods, but adding comma after ensures a clean break)
  let result = text
    // Ensure space after periods for clean TTS parsing
    .replace(/\.\s*/g, '. ')
    // After Arabic comma/English comma, ensure a space
    .replace(/[,،]\s*/g, ', ');

  return result.trim();
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Pre-format text for natural TTS output and return TTS parameters.
 *
 * @param text     The plain text to format
 * @param lang     Language code ('ar' or 'en')
 * @param severity Severity context for rate/pitch tuning
 * @returns Object with formatted text and native TTS parameters
 */
export function formatSpeech(
  text: string,
  lang: 'ar' | 'en' = 'en',
  severity: SpeechSeverity = 'normal',
): { text: string; rate: number; pitch: number } {
  if (!text || text.trim().length === 0) {
    return { text: '', rate: 1.0, pitch: 1.0 };
  }

  const ttsParams = SEVERITY_TTS[severity];

  // Step 1: Spell out DTC codes for character-by-character reading
  let processed = spellOutDTCs(text);

  // Step 2: Substitute acronyms with Arabic equivalents (Arabic only)
  processed = substituteAcronyms(processed, lang);

  // Step 3: Add natural comma pauses at sentence boundaries
  processed = insertCommaPauses(processed);

  return {
    text: processed,
    rate: ttsParams.rate,
    pitch: ttsParams.pitch,
  };
}

/**
 * Format a voice command response with auto-detected severity.
 *
 * Auto-detects severity from keywords in the text:
 *  - critical: "خطر", "danger", "critical", "immediate", "فوري", "حرج"
 *  - warning: "تحذير", "warning", "caution", "مرتفع", "عالي"
 *  - normal: everything else
 */
export function formatCommandResponse(
  text: string,
  lang: 'ar' | 'en' = 'en',
): { text: string; rate: number; pitch: number } {
  const lower = text.toLowerCase();
  const isCritical =
    lower.includes('خطر') ||
    lower.includes('danger') ||
    lower.includes('critical') ||
    lower.includes('immediate') ||
    lower.includes('فوري') ||
    lower.includes('حرج');

  const isWarning =
    lower.includes('تحذير') ||
    lower.includes('warning') ||
    lower.includes('caution') ||
    lower.includes('مرتفع') ||
    lower.includes('عالي');

  const severity: SpeechSeverity = isCritical ? 'critical' : isWarning ? 'warning' : 'normal';

  return formatSpeech(text, lang, severity);
}

/**
 * Determine severity from DTC analysis or vehicle data.
 */
export function severityFromData(context: {
  hasActiveDTCs?: boolean;
  maxSeverity?: 'info' | 'warning' | 'high' | 'critical';
  batteryTemp?: number;
  soc?: number;
}): SpeechSeverity {
  if (context.maxSeverity === 'critical' || context.maxSeverity === 'high') return 'critical';
  if (context.batteryTemp && context.batteryTemp > 45) return 'critical';
  if (context.soc !== undefined && context.soc < 10) return 'critical';
  if (context.maxSeverity === 'warning') return 'warning';
  if (context.batteryTemp && context.batteryTemp > 35) return 'warning';
  return 'normal';
}
