const prisma = require('../config/db');
const { ok, fail } = require('../utils/api');
const { chat, configured } = require('../services/ai');
const clinicalEngine = require('../services/clinicalEngine');
const healthAnalyticsEngine = require('../services/healthAnalyticsEngine');
const AIHealthAssistant = require('../ai/AIHealthAssistant');
const v = require('../utils/validate');
const { recordHistory } = require('../services/history');

async function create(req, res) {
  let p;
  try {
    p = v.chat.parse(req.body);
  } catch (err) {
    p = { message: String(req.body?.message || '').trim(), conversationId: req.body?.conversationId || null };
    if (!p.message) return fail(res, 400, 'Message cannot be empty.');
  }

  // Resolve active user (auth or visitor fallback)
  let activeUserId = req.userId;
  if (!activeUserId) {
    try {
      const defaultUser = await prisma.user.findFirst({ select: { id: true } });
      if (defaultUser) activeUserId = defaultUser.id;
    } catch (dbErr) {
      console.warn('[Chat] Could not query default user from DB:', dbErr.message);
    }
  }

  // Load user's actual health metrics and clinical abnormalities
  let healthProfile = null;
  let wearableContext = '';
  if (activeUserId) {
    try {
      healthProfile = await healthAnalyticsEngine.getUserHealthMetrics(activeUserId);
      wearableContext = healthAnalyticsEngine.buildAiHealthContext(healthProfile);
    } catch (wearableErr) {
      console.warn('[Chat] Wearable context fetch skipped:', wearableErr.message);
    }
  }

  // If user is a guest (and no user was resolved in database)
  if (!req.userId && !activeUserId) {
    try {
      const reply = await chat([{ role: 'user', message: p.message }]);
      return ok(res, { conversationId: null, reply });
    } catch (err) {
      console.warn('[Chat] Safe fallback triggered for guest:', err.message);
      const reply = clinicalEngine.generateClinicalResponse(p.message, healthProfile);
      return ok(res, { conversationId: null, reply });
    }
  }

  let conversation;
  try {
    const convoUserId = req.userId || activeUserId;
    if (p.conversationId) {
      conversation = await prisma.chatConversation.findFirst({
        where: { id: p.conversationId, userId: convoUserId }
      });
      if (!conversation) {
        conversation = await prisma.chatConversation.create({ data: { userId: convoUserId } });
      }
    } else {
      conversation = await prisma.chatConversation.create({ data: { userId: convoUserId } });
    }
  } catch (dbErr) {
    console.warn('[Chat] Conversation DB error, proceeding stateless:', dbErr.message);
  }

  let history = [];
  if (conversation?.id) {
    try {
      history = await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20
      });
    } catch (histErr) {
      console.warn('[Chat] History fetch error:', histErr.message);
    }
  }

  const userMsg = p.message;
  let reply;
  try {
    reply = await AIHealthAssistant.handleChat(convoUserId, userMsg, history);
  } catch (err) {
    console.warn('[Chat] Service error, using clinical reasoning fallback:', err.message);
    reply = clinicalEngine.generateClinicalResponse(userMsg, healthProfile);
  }

  if (conversation?.id) {
    try {
      await prisma.chatMessage.createMany({
        data: [
          { conversationId: conversation.id, role: 'user', message: p.message },
          { conversationId: conversation.id, role: 'assistant', message: reply }
        ]
      });
      await recordHistory({
        userId: req.userId,
        action: 'CHAT',
        module: 'AI',
        title: 'AI health assistant conversation',
        details: 'A message was sent to the SheCare AI assistant and a response was received.',
        entityId: conversation.id
      }).catch(() => {});
    } catch (logErr) {
      console.warn('[Chat] Failed to log chat message to DB:', logErr.message);
    }
  }

  return ok(res, { conversationId: conversation?.id || null, reply });
}

async function conversations(req, res) {
  try {
    return ok(res, await prisma.chatConversation.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 40 } }
    }));
  } catch (err) {
    return ok(res, []);
  }
}

module.exports = { create, conversations };
