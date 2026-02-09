const https = require('https');
const { saveSlackChannelId } = require('./config');

function sanitizeChannelName(label) {
  // Slack channel names: lowercase, numbers, hyphens, underscores, max 80 chars
  return ('claude-' + label)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

async function ensureChannel(config) {
  // If channel is already set (from env var or saved channel_id), use it
  if (config.slack.channel) {
    return config.slack.channel;
  }

  // If auto_create_channel is not enabled, we can't proceed
  if (!config.slack.auto_create_channel) {
    throw new Error('Slack channel not configured. Set the channel env var or enable auto_create_channel.');
  }

  const token = config.slack.bot_token;
  if (!token) {
    throw new Error('Slack bot_token not configured');
  }

  const channelName = sanitizeChannelName(config.project_label || 'notifications');

  // Try to create the channel
  const result = await slackApiPost('conversations.create', token, {
    name: channelName,
    is_private: false,
  });

  if (result.ok) {
    const channelId = result.channel.id;
    // Cache the channel ID back to config
    saveSlackChannelId(config, channelId);
    config.slack.channel = channelId;
    config.slack.channel_id = channelId;
    return channelId;
  }

  // If channel already exists, look it up by name
  if (result.error === 'name_taken') {
    const listResult = await slackApiGet('conversations.list', token, {
      types: 'public_channel',
      limit: '1000',
    });

    if (listResult.ok) {
      const existing = listResult.channels.find(ch => ch.name === channelName);
      if (existing) {
        // Join the channel in case the bot isn't a member
        await slackApiPost('conversations.join', token, { channel: existing.id });
        saveSlackChannelId(config, existing.id);
        config.slack.channel = existing.id;
        config.slack.channel_id = existing.id;
        return existing.id;
      }
    }
  }

  throw new Error(`Failed to create/find Slack channel "${channelName}": ${result.error || JSON.stringify(result)}`);
}

async function sendSlack(config, messages) {
  const token = config.slack.bot_token;
  const channel = config.slack.channel;

  if (!token || !channel) {
    throw new Error('Slack bot_token or channel not configured');
  }

  // Support single string or array of messages
  const msgArray = Array.isArray(messages) ? messages : [messages];
  let lastRef;

  for (const message of msgArray) {
    const result = await slackApiPost('chat.postMessage', token, {
      channel: channel,
      text: message,
      mrkdwn: true,
    });

    if (!result.ok) {
      throw new Error(`Slack chat.postMessage failed: ${result.error || JSON.stringify(result)}`);
    }

    lastRef = { channel: result.channel, ts: result.ts };
  }

  return lastRef;
}

async function pollSlackReply(config, messageRef, timeoutSeconds, shouldAbort) {
  if (!messageRef) return null;

  const token = config.slack.bot_token;
  const deadline = Date.now() + (timeoutSeconds * 1000);
  const pollInterval = 5000;

  while (Date.now() < deadline) {
    // Check if user responded in the terminal
    if (shouldAbort && shouldAbort()) {
      return null;
    }

    const result = await slackApiGet('conversations.replies', token, {
      channel: messageRef.channel,
      ts: messageRef.ts,
      limit: '10',
    });

    if (result.ok && result.messages) {
      // First message is the parent; look for thread replies
      const replies = result.messages.slice(1);
      if (replies.length > 0) {
        return replies[replies.length - 1].text;
      }
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  return null;
}

function slackApiPost(method, token, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);

    const req = https.request({
      hostname: 'slack.com',
      path: `/api/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
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
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

function slackApiGet(method, token, params) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();

    const req = https.request({
      hostname: 'slack.com',
      path: `/api/${method}?${query}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.end();
  });
}

module.exports = { ensureChannel, sendSlack, pollSlackReply };
