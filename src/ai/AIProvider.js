'use strict';

const env = require('../config/env');
const OpenAI = require('openai');

/**
 * AIProvider — Manages configurable high-quality LLM providers:
 * 1. OpenAI (configurable model: e.g. gpt-4o, gpt-4o-mini)
 * 2. Gemini (gemini-1.5-pro / gemini-1.5-flash)
 * 3. Groq (llama-3.3-70b-versatile)
 * 4. Custom AI Agent endpoint
 */
class AIProvider {
  constructor() {
    this.openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  }

  isConfigured() {
    return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.GROQ_API_KEY || env.AI_AGENT_URL);
  }

  async call(messages, systemInstructions) {
    // Priority 1: OpenAI (High-quality flagship model, e.g. gpt-4o / gpt-4o-mini)
    if (this.openaiClient && env.OPENAI_API_KEY) {
      try {
        const formatted = [
          { role: 'system', content: systemInstructions },
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || m.message || '')
          }))
        ];
        const res = await this.openaiClient.chat.completions.create({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: formatted,
          temperature: 0.2,
          max_tokens: 1200
        });
        const reply = res.choices?.[0]?.message?.content?.trim();
        if (reply && reply.length > 20) return reply;
      } catch (err) {
        console.warn('[AIProvider] OpenAI attempt failed, trying next provider:', err.message);
      }
    }

    // Priority 2: Gemini
    if (env.GEMINI_API_KEY) {
      try {
        const contents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || m.message || '') }]
        }));
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstructions }] },
            contents,
            generationConfig: { maxOutputTokens: 1200, temperature: 0.2 }
          }),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply && reply.length > 20) return reply;
        }
      } catch (err) {
        console.warn('[AIProvider] Gemini attempt failed, trying next provider:', err.message);
      }
    }

    // Priority 3: Groq
    if (env.GROQ_API_KEY) {
      try {
        const payload = {
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstructions },
            ...messages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: String(m.content || m.message || '')
            }))
          ],
          temperature: 0.2,
          max_tokens: 1200
        };
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GROQ_API_KEY}`
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply && reply.length > 20) return reply;
        }
      } catch (err) {
        console.warn('[AIProvider] Groq attempt failed:', err.message);
      }
    }

    // Priority 4: Custom AI Agent
    if (env.AI_AGENT_URL) {
      try {
        const payload = {
          instructions: systemInstructions,
          temperature: 0.2,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || m.message || '')
          }))
        };
        const headers = { 'Content-Type': 'application/json' };
        if (env.AI_AGENT_KEY) headers['Authorization'] = `Bearer ${env.AI_AGENT_KEY}`;
        const res = await fetch(env.AI_AGENT_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const reply = (json?.reply || json?.output || json?.response || '').trim();
          if (reply && reply.length > 20) return reply;
        }
      } catch (err) {
        console.warn('[AIProvider] Custom Agent attempt failed:', err.message);
      }
    }

    return null; // Signals need for Clinical Health Expert Knowledge Engine fallback
  }
}

module.exports = new AIProvider();
