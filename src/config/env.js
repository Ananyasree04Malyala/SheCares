const { z } = require('zod');
require('dotenv').config();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().trim().optional().default('gpt-4o-mini'),
  AI_AGENT_URL: z.string().optional().default(''),
  AI_AGENT_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),
  FIREBASE_API_KEY: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Environment configuration error:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
module.exports = parsed.data;
