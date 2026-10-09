'use strict';

const AIProvider = require('./AIProvider');
const HealthContextBuilder = require('./HealthContextBuilder');
const SafetyValidator = require('./SafetyValidator');
const HealthAnalytics = require('../health/HealthAnalytics');
const clinicalEngine = require('../services/clinicalEngine');

const SYSTEM_INSTRUCTIONS = `You are SheCare AI, an expert clinical health-support and assessment assistant specialized in women's health, obstetrics, cardiology, endocrinology, smartwatch biometrics, and yoga biomechanics.

PRIMARY GUIDELINES:
1. ACCURACY & ZERO HALLUCINATION:
   - Always reference the user's authentic confirmed biometrics provided in the context when answering health queries.
   - If a biometric or medical history is NOT in the confirmed data, explicitly say: "I don't currently have that health data available."
   - NEVER invent, extrapolate, or fabricate numbers, dates, sleep hours, heart rates, blood pressures, or lab results.

2. EVIDENCE-BASED CLINICAL GROUNDING:
   - Follow ACOG, AHA/ACC, ADA/RSSDI, and WHO guidelines.
   - Clearly distinguish between:
     * OBSERVED DATA (what was actually recorded)
     * POSSIBLE EXPLANATIONS (physiological or lifestyle reasons for changes)
     * MEDICAL DIAGNOSIS (never state a definitive personal diagnosis; advise clinical evaluation when needed)

3. CONVERSATIONAL CONTEXT & FOLLOW-UPS:
   - Remember the timeframe and context of previous turns. If the user asks "What about my sleep?" after discussing their heart rate, connect the two using their real data.

4. EMERGENCY TRIAGE:
   - For acute red-flag symptoms (severe chest pain, shortness of breath, sudden numbness, severe hemorrhage, BP > 180/120 mmHg), immediately advise emergency care and cite 112 (India National Emergency).`;

class AIHealthAssistant {
  /**
   * Process a user chat message with full health data grounding
   * @param {string} userId - Authenticated user id or null
   * @param {string} userMessage - Latest user input
   * @param {Array<object>} conversationHistory - Prior conversation messages
   * @returns {Promise<string>} Validated, grounded health response
   */
  static async handleChat(userId, userMessage, conversationHistory = []) {
    const rawMessage = (userMessage || '').trim();
    if (!rawMessage) return "Please enter a question or health symptom to get started.";

    // 1. Fetch user's authentic health analytics
    let healthAnalytics = null;
    let contextObj = { contextText: '', relevantMetricsFound: false, missingRequestedMetrics: [] };

    if (userId) {
      try {
        healthAnalytics = await HealthAnalytics.getAnalytics(userId);
        if (healthAnalytics) {
          contextObj = HealthContextBuilder.buildContext(healthAnalytics, rawMessage);
        }
      } catch (err) {
        console.warn('[AIHealthAssistant] Analytics fetch failed:', err.message);
      }
    }

    // 2. Build message stream with injected health context
    const messages = [];
    // Prior history (up to last 10 turns)
    const recentHistory = (conversationHistory || []).slice(-10);
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: String(h.message || h.content || '')
      });
    }

    // Current turn with explicit health context
    const currentTurnContent = contextObj.contextText
      ? `${contextObj.contextText}\n\nUSER QUESTION: ${rawMessage}`
      : rawMessage;

    messages.push({ role: 'user', content: currentTurnContent });

    // 3. Try high-quality external AI provider
    let reply = null;
    if (AIProvider.isConfigured()) {
      try {
        reply = await AIProvider.call(messages, SYSTEM_INSTRUCTIONS);
      } catch (aiErr) {
        console.warn('[AIHealthAssistant] External AI Provider error:', aiErr.message);
      }
    }

    // 4. If external provider unavailable, use deterministic SheCare Clinical Engine
    if (!reply) {
      reply = clinicalEngine.generateClinicalResponse(rawMessage, healthAnalytics);
    }

    // 5. Run safety validation and red-flag checking
    return SafetyValidator.validate(reply, healthAnalytics);
  }
}

module.exports = AIHealthAssistant;
