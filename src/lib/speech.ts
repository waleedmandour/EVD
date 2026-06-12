/**
 * SSML Speech Formatter for EVDx
 *
 * Enhances TTS output with natural prosody, pauses, pronunciation
 * controls, and severity-based voice tuning for Arabic and English.
 *
 * Supports:
 *  - <break> for natural pauses between sentences and before data values
 *  - <prosody> for rate/pitch/volume adjustments based on severity
 *  - <say-as> for proper number and DTC code reading
 *  - <sub> for acronym pronunciation in Arabic
 *  - <emphasis> for key diagnostic terms
 */

export type SpeechSeverity = 'normal' | 'warning' | 'critical';

// ─── Severity Presets ─────────────────────────────────────────────────────────

const SEVERITY_PROSODY: Record<SpeechSeverity, { rate: string; pitch: string; volume: string }> = {
  normal:   { rate: '95%',  pitch: '+3%',  volume: '+0dB' },
  warning:  { rate: '88%',  pitch: '-2%',  volume: '+3dB' },
  critical: { rate: '82%',  pitch: '-5%',  volume: '+6dB' },
};

// ─── Acronym Substitutions (Arabic) ───────────────────────────────────────────

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
  kW: 'كيلووات',
  kWh: 'كيلووات ساعة',
  EV: 'سيارة كهربائية',
  ICE: 'سيارة بنزين',
  LED: 'إل إي دي',
  GPS: 'جي بي إس',
  BLE: 'بلوتوث منخفض الطاقة',
  WiFi: 'واي فاي',
  USB: 'يو إس بي',
  PDF: 'بي دي إف',
  CSV: 'سي إس في',
};

// ─── DTC Code Pattern ─────────────────────────────────────────────────────────

const DTC_PATTERN = /\b([PBUCEC][0-9A-F]{2,5})\b/gi;

// ─── Number Pattern ───────────────────────────────────────────────────────────

const NUMBER_PATTERN = /\b(\d+\.?\d*)\b/g;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Escape XML special characters in text content (not inside SSML tags).
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wrap DTC codes in <say-as interpret-as="characters"> for proper spelling.
 * e.g. "P0A80" → "<say-as interpret-as='characters'>P0A80</say-as>"
 */
function wrapDTCs(text: string): string {
  return text.replace(DTC_PATTERN, (match) => {
    return `<say-as interpret-as="characters">${match}</say-as>`;
  });
}

/**
 * Wrap standalone numbers in <say-as interpret-as="cardinal"> for proper reading.
 * Avoids re-wrapping numbers already inside <say-as> tags.
 */
function wrapNumbers(text: string): string {
  return text.replace(NUMBER_PATTERN, (match, num, offset) => {
    // Don't wrap if inside a <say-as> tag already
    const before = text.substring(Math.max(0, offset - 20), offset);
    if (before.includes('<say-as') && !before.includes('</say-as>')) return match;
    // Don't wrap very small numbers that are likely part of SSML attributes
    if (match.includes('.')) return match;
    return `<say-as interpret-as="cardinal">${num}</say-as>`;
  });
}

/**
 * Substitute English acronyms with Arabic aliases using <sub> tags.
 * Only applied when language is Arabic.
 */
function substituteAcronyms(text: string): string {
  let result = text;
  for (const [acronym, arabicAlias] of Object.entries(ARABIC_ACRONYMS)) {
    // Match whole-word only, case-sensitive
    const regex = new RegExp(`\\b${acronym}\\b`, 'g');
    result = result.replace(regex, `<sub alias="${escapeXml(arabicAlias)}">${acronym}</sub>`);
  }
  return result;
}

/**
 * Insert natural pauses at sentence boundaries.
 * Arabic: period (.), comma (،), Arabic comma, exclamation, question mark
 * English: period, comma, exclamation, question mark
 */
function insertPauses(text: string): string {
  // Pause after sentence endings
  let result = text
    // Period or Arabic period followed by space → 400ms break
    .replace(/([.。])\s+/g, '$1<break time="400ms"/>')
    // Arabic comma or English comma → 250ms break
    .replace(/([,،])\s+/g, '$1<break time="250ms"/>')
    // Exclamation mark → 450ms break
    .replace(/([!！])\s*/g, '$1<break time="450ms"/>')
    // Question mark → 450ms break
    .replace(/([?؟])\s*/g, '$1<break time="450ms"/>')
    // Colon (used before data values) → 200ms break
    .replace(/([:：])\s*/g, '$1<break time="200ms"/>');

  return result;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Format text with SSML for natural-sounding TTS output.
 *
 * @param text    The plain text to format
 * @param lang    Language code ('ar' or 'en')
 * @param severity Severity context for prosody tuning
 * @returns SSML-wrapped string ready for TTS engine
 */
export function formatSpeech(
  text: string,
  lang: 'ar' | 'en' = 'en',
  severity: SpeechSeverity = 'normal',
): string {
  if (!text || text.trim().length === 0) return '';

  // Check if text is already SSML-wrapped
  if (text.trim().startsWith('<speak>')) return text;

  const prosody = SEVERITY_PROSODY[severity];

  // Step 1: Escape XML entities in raw text
  let processed = escapeXml(text);

  // Step 2: Wrap DTC codes for character-by-character reading
  processed = wrapDTCs(processed);

  // Step 3: Wrap numbers for cardinal reading
  processed = wrapNumbers(processed);

  // Step 4: Substitute acronyms (Arabic only)
  if (lang === 'ar') {
    processed = substituteAcronyms(processed);
  }

  // Step 5: Insert natural pauses at punctuation
  processed = insertPauses(processed);

  // Step 6: Wrap in prosody element and speak root
  return `<speak><prosody rate="${prosody.rate}" pitch="${prosody.pitch}" volume="${prosody.volume}">${processed}</prosody></speak>`;
}

/**
 * Format a voice command response with appropriate severity.
 *
 * Auto-detects severity from keywords in the text:
 *  - critical: "خطر", "danger", "critical", "immediate", "فوري"
 *  - warning: "تحذير", "warning", "caution", "مرتفع"
 *  - normal: everything else
 */
export function formatCommandResponse(
  text: string,
  lang: 'ar' | 'en' = 'en',
): string {
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
