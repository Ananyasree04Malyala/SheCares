/**
 * SheCare Real-Time Event Hub (Server-Sent Events)
 * 
 * Provides real-time bidirectional communication and instant telemetry streaming
 * between smartwatches, connected medical devices, mobile phone companion bridges,
 * and user browser tabs without polling delay.
 */

'use strict';

const clients = new Set();

/**
 * Register a new SSE client
 */
function registerClient(req, res, userId = null) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const client = {
    id: 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || null,
    res
  };

  clients.add(client);

  // Send initial connected confirmation event
  const initPayload = JSON.stringify({
    type: 'connected',
    clientId: client.id,
    timestamp: new Date().toISOString(),
    message: 'SheCare Real-Time Telemetry Stream connected'
  });
  res.write(`event: connected\ndata: ${initPayload}\n\n`);

  // Handle client disconnection
  req.on('close', () => {
    clients.delete(client);
  });

  return client;
}

/**
 * Broadcast an event to connected clients
 * @param {string} eventName - e.g. 'smartwatch_stream', 'device_reading', 'sos_alert'
 * @param {object} data - payload
 * @param {string|null} targetUserId - if provided, only sends to that user; null sends to all
 */
function broadcast(eventName, data, targetUserId = null) {
  if (clients.size === 0) return;

  const payload = JSON.stringify({
    event: eventName,
    data,
    timestamp: new Date().toISOString()
  });

  for (const client of clients) {
    try {
      if (!targetUserId || !client.userId || client.userId === targetUserId) {
        client.res.write(`event: ${eventName}\ndata: ${payload}\n\n`);
      }
    } catch (e) {
      clients.delete(client);
    }
  }
}

/**
 * Periodic keepalive ping to prevent proxy/browser timeout
 */
setInterval(() => {
  for (const client of clients) {
    try {
      client.res.write(': keepalive\n\n');
    } catch {
      clients.delete(client);
    }
  }
}, 25000);

module.exports = {
  registerClient,
  broadcast,
  getClientCount: () => clients.size
};
