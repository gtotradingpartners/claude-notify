const https = require('https');

async function sendSlack(config, message) {
  const token = config.slack.bot_token;
  const channel = config.slack.channel;

  if (!token || !channel) {
    throw new Error('Slack bot_token or channel not configured');
  }

  const result = await slackApiPost('chat.postMessage', token, {
    channel: channel,
    text: message,
    mrkdwn: true,
  });

  if (!result.ok) {
    throw new Error(`Slack chat.postMessage failed: ${result.error || JSON.stringify(result)}`);
  }

  return { channel: result.channel, ts: result.ts };
}

async function pollSlackReply(config, messageRef, timeoutSeconds) {
  if (!messageRef) return null;

  const token = config.slack.bot_token;
  const deadline = Date.now() + (timeoutSeconds * 1000);
  const pollInterval = 5000;

  while (Date.now() < deadline) {
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

module.exports = { sendSlack, pollSlackReply };
