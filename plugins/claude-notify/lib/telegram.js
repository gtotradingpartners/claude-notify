const https = require('https');

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getTopicId(config) {
  // Return configured topic_id, or null (messages go to General topic)
  return config.telegram.topic_id ?? null;
}

async function sendTelegram(config, message, topicId) {
  const token = config.telegram.bot_token;
  const groupId = config.telegram.group_id;

  if (!token || !groupId) {
    throw new Error('Telegram bot_token or group_id not configured');
  }

  const payload = {
    chat_id: groupId,
    text: message,
    parse_mode: 'HTML',
  };

  if (topicId) {
    payload.message_thread_id = topicId;
  }

  if (config.platform_sound === false) {
    payload.disable_notification = true;
  }

  const result = await httpPost(`${TELEGRAM_API}${token}/sendMessage`, payload);

  if (!result.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(result)}`);
  }

  return result.result.message_id;
}

async function pollTelegramReply(config, topicId, timeoutSeconds, shouldAbort) {
  const token = config.telegram.bot_token;
  const groupId = config.telegram.group_id;
  const deadline = Date.now() + (timeoutSeconds * 1000);

  // Establish offset by getting the latest update
  let offset = 0;
  const initial = await httpPost(`${TELEGRAM_API}${token}/getUpdates`, {
    offset: -1,
    limit: 1,
  });
  if (initial.ok && initial.result && initial.result.length > 0) {
    offset = initial.result[initial.result.length - 1].update_id + 1;
  }

  while (Date.now() < deadline) {
    // Check if user responded in the terminal
    if (shouldAbort && shouldAbort()) {
      return null;
    }

    const remainingSeconds = Math.min(
      5, // Short polls so we can check terminal between polls
      Math.floor((deadline - Date.now()) / 1000)
    );

    if (remainingSeconds <= 0) break;

    const updates = await httpPost(`${TELEGRAM_API}${token}/getUpdates`, {
      offset: offset,
      timeout: remainingSeconds,
      allowed_updates: ['message'],
    });

    if (!updates.ok) continue;

    for (const update of (updates.result || [])) {
      const msg = update.message;

      // Non-message updates or non-text: safe to consume, not relevant to anyone
      if (!msg || !msg.text) {
        offset = update.update_id + 1;
        continue;
      }

      // Messages from a different chat entirely: safe to consume
      if (String(msg.chat?.id) !== String(groupId)) {
        offset = update.update_id + 1;
        continue;
      }

      // Message is in our group but a DIFFERENT topic: DO NOT advance offset.
      // Leave it for other projects' polling to pick up.
      if (topicId && msg.message_thread_id !== topicId) {
        continue;
      }

      // Match: right group AND right topic. Consume and return.
      offset = update.update_id + 1;
      await httpPost(`${TELEGRAM_API}${token}/getUpdates`, { offset: offset });
      return msg.text;
    }
  }

  return null;
}

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseData.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = { getTopicId, sendTelegram, pollTelegramReply };
