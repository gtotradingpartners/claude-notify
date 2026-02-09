const EVENT_EMOJI = {
  permission_prompt: '\u{1F510}',  // 🔐
  idle_prompt: '\u{1F4A4}',        // 💤
  elicitation_dialog: '\u{1F514}', // 🔔
  auth_success: '\u{2705}',        // ✅
  Stop: '\u{1F6D1}',              // 🛑
  SubagentStop: '\u{1F539}',      // 🔹
};

const DEFAULT_EMOJI = '\u{1F514}'; // 🔔
const TELEGRAM_MAX_LENGTH = 4096;

function parseEventDetails(hookInput) {
  const eventName = hookInput.hook_event_name;

  if (eventName === 'Notification') {
    const notifType = hookInput.notification_type || 'unknown';
    return {
      emoji: EVENT_EMOJI[notifType] || DEFAULT_EMOJI,
      title: `Notification: ${notifType}`,
      body: hookInput.message || '',
    };
  }

  if (eventName === 'Stop') {
    return {
      emoji: EVENT_EMOJI.Stop,
      title: 'Claude has stopped',
      body: 'The main agent finished responding.',
    };
  }

  if (eventName === 'SubagentStop') {
    const agentType = hookInput.agent_type || 'unknown';
    return {
      emoji: EVENT_EMOJI.SubagentStop,
      title: `Subagent stopped (${agentType})`,
      body: `Agent ${hookInput.agent_id || ''} finished.`,
    };
  }

  return {
    emoji: DEFAULT_EMOJI,
    title: eventName,
    body: hookInput.message || '',
  };
}

function formatMessage(hookInput, config, historyContext, willPollReply) {
  if (config.channel === 'telegram') {
    return formatTelegramHTML(hookInput, config, historyContext, willPollReply);
  }
  return formatSlackMrkdwn(hookInput, config, historyContext, willPollReply);
}

function formatTelegramHTML(hookInput, config, historyContext, willPollReply) {
  const { emoji, title, body } = parseEventDetails(hookInput);
  const project = config.project_label;
  const sessionId = hookInput.session_id || 'unknown';

  // Build header
  let header = `${emoji} <b>${escapeHTML(title)}</b>\n`;
  header += `<b>Project:</b> ${escapeHTML(project)}\n`;
  header += `<b>Session:</b> <code>${escapeHTML(sessionId)}</code>\n\n`;
  header += `${escapeHTML(body)}\n`;

  // Build footer
  let footer = '';
  if (willPollReply) {
    footer = `\n<i>Reply to this message or respond directly in Claude Code.</i>`;
  }

  // If no context, single message
  if (!historyContext) {
    return [header + footer];
  }

  const escapedContext = escapeHTML(historyContext);
  const contextHeader = '\n<b>Recent context:</b>\n';

  // Try to fit in one message
  const singleMsg = header + contextHeader + `<pre>${escapedContext}</pre>\n` + footer;
  if (singleMsg.length <= TELEGRAM_MAX_LENGTH) {
    return [singleMsg];
  }

  // Split into multiple messages: header first, then context chunks, footer on last
  const messages = [header];
  const contextPrefix = '<pre>';
  const contextSuffix = '</pre>';
  const chunkMax = TELEGRAM_MAX_LENGTH - contextPrefix.length - contextSuffix.length - 20;

  // Split context into chunks at line boundaries
  const contextLines = escapedContext.split('\n');
  let currentChunk = contextHeader + contextPrefix;

  for (const line of contextLines) {
    if (currentChunk.length + line.length + 1 > chunkMax && currentChunk.length > contextPrefix.length + contextHeader.length) {
      messages.push(currentChunk + contextSuffix);
      currentChunk = contextPrefix;
    }
    currentChunk += (currentChunk === contextPrefix ? '' : '\n') + line;
  }

  if (currentChunk.length > contextPrefix.length) {
    // Add footer to last context chunk if it fits
    const lastChunk = currentChunk + contextSuffix;
    if (lastChunk.length + footer.length <= TELEGRAM_MAX_LENGTH) {
      messages.push(lastChunk + footer);
    } else {
      messages.push(lastChunk);
      if (footer) messages.push(footer);
    }
  } else if (footer) {
    messages.push(footer);
  }

  return messages;
}

function formatSlackMrkdwn(hookInput, config, historyContext, willPollReply) {
  const { emoji, title, body } = parseEventDetails(hookInput);
  const project = config.project_label;
  const sessionId = hookInput.session_id || 'unknown';

  let header = `${emoji} *${title}*\n`;
  header += `*Project:* ${project}\n`;
  header += `*Session:* \`${sessionId}\`\n\n`;
  header += `${body}\n`;

  let footer = '';
  if (willPollReply) {
    footer = `\n_Reply in thread or respond directly in Claude Code._`;
  }

  if (!historyContext) {
    return [header + footer];
  }

  // Slack can handle longer messages but keep it reasonable
  const singleMsg = header + `\n*Recent context:*\n\`\`\`${historyContext}\`\`\`\n` + footer;
  if (singleMsg.length <= 4000) {
    return [singleMsg];
  }

  // Split: header, context, footer
  const messages = [header];
  messages.push(`*Recent context:*\n\`\`\`${historyContext}\`\`\``);
  if (footer) messages.push(footer);
  return messages;
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { formatMessage };
