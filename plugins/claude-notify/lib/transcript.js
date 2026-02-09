const fs = require('fs');

const HISTORY_MSG_MAX_LENGTH = 2000;

function parseTranscript(transcriptPath, lineCount) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';

  let content;
  try {
    content = fs.readFileSync(transcriptPath, 'utf-8');
  } catch (e) {
    return '';
  }

  const lines = content.split('\n').filter(line => line.trim());
  const messages = [];

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (_) {
      continue;
    }

    // Only include user and assistant text messages
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    if (entry.isMeta) continue;

    const role = entry.type === 'user' ? 'Human' : 'Claude';
    let text = '';

    if (typeof entry.message?.content === 'string') {
      text = entry.message.content;
    } else if (Array.isArray(entry.message?.content)) {
      // Extract text blocks only (skip thinking, tool_use, tool_result, etc.)
      text = entry.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }

    text = text.trim();
    if (!text) continue;

    // Truncate long messages
    if (text.length > HISTORY_MSG_MAX_LENGTH) {
      text = text.substring(0, HISTORY_MSG_MAX_LENGTH) + '...[truncated]';
    }

    messages.push(`[${role}]: ${text}`);
  }

  // Return the last N messages
  return messages.slice(-lineCount).join('\n\n');
}

module.exports = { parseTranscript };
