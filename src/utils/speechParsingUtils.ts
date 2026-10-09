/**
 * Voice Recognition & Egyptian Arabic Natural Speech Parser
 * for vehicle archive auditing and voice data entry.
 */

// Egyptian Arabic spoken digits dictionary
const ARABIC_DIGIT_WORDS: Record<string, string> = {
  'صفر': '0',
  'زيرو': '0',
  'واحد': '1',
  'اتنين': '2',
  'تنين': '2',
  'اثنان': '2',
  'تلاتة': '3',
  'تلاته': '3',
  'ثلاثة': '3',
  'ثلاثه': '3',
  'اربعة': '4',
  'اربعه': '4',
  'أربعة': '4',
  'خمسة': '5',
  'خمسه': '5',
  'ستة': '6',
  'سته': '6',
  'سبعة': '7',
  'سبعه': '7',
  'تمانية': '8',
  'ثمانية': '8',
  'ثمانيه': '8',
  'تمانيه': '8',
  'تسعة': '9',
  'تسعه': '9',
};

/**
 * Converts spoken Arabic digit words ("تلاتة تمانية ستة اربعة...") to digits ("3864...")
 */
export function convertSpokenWordsToDigits(text: string): string {
  if (!text) return '';
  const tokens = text.split(/\s+/);
  const result: string[] = [];

  for (const token of tokens) {
    const cleanToken = token.replace(/[^\u0621-\u064A0-9]/g, '');
    if (ARABIC_DIGIT_WORDS[cleanToken]) {
      result.push(ARABIC_DIGIT_WORDS[cleanToken]);
    } else if (/\d+/.test(token)) {
      result.push(token.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)));
    } else {
      result.push(token);
    }
  }

  // Join adjacent single digits
  let merged = result.join(' ');
  merged = merged.replace(/(\d)\s+(?=\d)/g, '$1');
  return merged;
}

export interface VoiceParsedIntent {
  action?: 'confirm_and_next' | 'next' | 'prev' | 'clear_alternates';
  engineNumber?: string;
  customerName?: string;
  trafficDepartment?: string;
  date?: string;
  rawTranscript: string;
  confidenceMessage?: string;
}

/**
 * Intelligent Egyptian speech intent parser.
 * Understands both structured voice commands and freeform speech.
 */
export function parseVoiceInput(rawText: string): VoiceParsedIntent {
  const clean = rawText.trim();
  const digitConverted = convertSpokenWordsToDigits(clean);
  const norm = clean.toLowerCase();

  const intent: VoiceParsedIntent = {
    rawTranscript: rawText,
  };

  // 1. Control Commands
  if (/^(اعتمد|تاكيد|تأكيد|احفظ|حفظ|تمام|صح)/.test(norm)) {
    intent.action = 'confirm_and_next';
    intent.confidenceMessage = 'أمر صوتي: اعتماد ومسح البدائل والانتقال للتالي';
    return intent;
  }

  if (/^(التالي|اللي بعده|بعده|التالى|قدام)/.test(norm)) {
    intent.action = 'next';
    intent.confidenceMessage = 'أمر صوتي: السجل التالي';
    return intent;
  }

  if (/^(السابق|اللي قبله|قبله|ورا|ارجع)/.test(norm)) {
    intent.action = 'prev';
    intent.confidenceMessage = 'أمر صوتي: السجل السابق';
    return intent;
  }

  if (/^(مسح البدائل|امسح البدائل|بدون بدائل)/.test(norm)) {
    intent.action = 'clear_alternates';
    intent.confidenceMessage = 'أمر صوتي: مسح البدائل المرجعية';
    return intent;
  }

  // 2. Multi-field voice extraction
  // Pattern: "ماتور [رقم]" or "رقم الماتور [رقم]"
  const engineMatch = digitConverted.match(/(?:ماتور|الماتور|رقم الماتور|موتور|الموتور)\s*([0-9A-Za-z]+)/);
  if (engineMatch) {
    intent.engineNumber = engineMatch[1];
  }

  // Pattern: "عميل [اسم]" or "المشتري [اسم]"
  const customerMatch = digitConverted.match(/(?:عميل|العميل|مشتري|المشتري|الزبون|باسم|بإسم)\s+([\u0621-\u064A\s]+?)(?=(?:مرور|المرور|ماتور|الماتور|تاريخ|التاريخ|$))/);
  if (customerMatch) {
    intent.customerName = customerMatch[1].trim();
  }

  // Pattern: "مرور [اسم]"
  const trafficMatch = digitConverted.match(/(?:مرور|المرور|وحدة مرور)\s+([\u0621-\u064A\s]+?)(?=(?:ماتور|الماتور|عميل|العميل|تاريخ|التاريخ|$))/);
  if (trafficMatch) {
    intent.trafficDepartment = trafficMatch[1].trim();
  }

  // Pattern: "تاريخ [تاريخ]"
  const dateMatch = digitConverted.match(/(?:تاريخ|التاريخ)\s*([\d/\-.]+)/);
  if (dateMatch) {
    intent.date = dateMatch[1].trim();
  }

  // 3. Freeform fallback if no keywords matched
  if (!intent.engineNumber && !intent.customerName && !intent.trafficDepartment) {
    // If input consists purely of digits (or digit words converted)
    const pureDigits = digitConverted.replace(/\s+/g, '');
    if (/^\d{3,12}$/.test(pureDigits)) {
      intent.engineNumber = pureDigits;
      intent.confidenceMessage = `تم التقاط رقم الماتور صوتياً: ${pureDigits}`;
    } else if (/^[\u0621-\u064A\s]{4,40}$/.test(clean)) {
      // Freeform Arabic words without numbers -> Customer Name
      intent.customerName = clean;
      intent.confidenceMessage = `تم التقاط اسم العميل صوتياً: ${clean}`;
    }
  }

  return intent;
}
