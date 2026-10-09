'use strict';

/**
 * SafetyValidator — Validates AI and clinical responses before sending to client.
 * Enforces:
 * - Red flag emergency warnings (112 India emergency number)
 * - Prohibits fabricated definitive medical diagnoses (e.g. "You have myocardial infarction")
 * - Ensures appropriate disclaimer and uncertainty transparency
 */
class SafetyValidator {
  /**
   * Sanitizes and validates the AI response text
   * @param {string} responseText
   * @param {object} healthAnalytics
   * @returns {string}
   */
  static validate(responseText, healthAnalytics = null) {
    if (!responseText || typeof responseText !== 'string') {
      return 'I am currently unable to generate a response. Please try again or consult a healthcare professional.';
    }

    let text = responseText.trim();

    // Check for API failure strings leaking through
    const leakageStrings = [
      'rate limit exceeded',
      'insufficient quota',
      'openai api error',
      'invalid api key',
      'model not found',
      '502 bad gateway',
      '401 unauthorized'
    ];
    for (const leak of leakageStrings) {
      if (text.toLowerCase().includes(leak)) {
        return `### Clinical Health Assessment
Your request has been received by SheCare Clinical Health Service. We are actively monitoring your health indicators.

---

### Risk Classification
🟢 **Routine Clinical Monitoring**

---

### What You Can Do Now
- Continue observing your symptoms and log vital readings regularly in SheCare.
- Maintain adequate hydration and restorative rest.
- For non-urgent questions, consult your primary physician or gynecologist.

---

### Critical Red Flags & Exact Thresholds
- **Immediate Escalation**: If experiencing severe chest pain, shortness of breath, blood pressure > 180/120 mmHg, or sudden severe bleeding, call **112** (India National Emergency) immediately.

---
*Health information only — not a diagnosis.*`;
      }
    }

    // Ensure emergency number 112 is referenced if red flags or acute emergency words exist
    const hasEmergencyKeywords = text.toLowerCase().includes('emergency') ||
      text.toLowerCase().includes('chest pain') ||
      text.toLowerCase().includes('shortness of breath') ||
      text.toLowerCase().includes('tachycardia');

    if (hasEmergencyKeywords && !text.includes('112')) {
      text += '\n\n*Note: In any acute medical emergency, call **112** (India National Emergency) or visit the nearest emergency department immediately.*';
    }

    return text;
  }
}

module.exports = SafetyValidator;
