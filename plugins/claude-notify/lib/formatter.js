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

  // Build header (always included)
  let header = `${emoji} <b>${escapeHTML(title)}</b>\n`;
  header += `<b>Project:</b> ${escapeHTML(project)}\n`;
  header += `<b>Session:</b> <code>${escapeHTML(sessionId)}</code>\n\n`;
  header += `${escapeHTML(body)}\n`;

  // Build footer (always included)
  let footer = '';
  if (willPollReply) {
    footer = `\n<i>Reply to this message or respond directly in Claude Code.</i>`;
  }

  // Fit history context into remaining space
  let contextBlock = '';
  if (historyContext) {
    const available = TELEGRAM_MAX_LENGTH - header.length - footer.length - 60; // 60 for markup overhead
    let trimmedContext = escapeHTML(historyContext);
    if (trimmedContext.length > available) {
      trimmedContext = trimmedContext.substring(trimmedContext.length - available) ;
      // Start from a clean line break
      const newlineIdx = trimmedContext.indexOf('\n');
      if (newlineIdx > 0 && newlineIdx < 100) {
        trimmedContext = trimmedContext.substring(newlineIdx + 1);
      }
      trimmedContext = '...\n' + trimmedContext;
    }
    contextBlock = `\n<b>Recent context:</b>\n<pre>${trimmedContext}</pre>\n`;
  }

  return header + contextBlock + footer;
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

  let contextBlock = '';
  if (historyContext) {
    // Slack limit is ~4000 chars for best rendering
    const available = 3500 - header.length - footer.length;
    let trimmedContext = historyContext;
    if (trimmedContext.length > available) {
      trimmedContext = trimmedContext.substring(trimmedContext.length - available);
      const newlineIdx = trimmedContext.indexOf('\n');
      if (newlineIdx > 0 && newlineIdx < 100) {
        trimmedContext = trimmedContext.substring(newlineIdx + 1);
      }
      trimmedContext = '...\n' + trimmedContext;
    }
    contextBlock = `\n*Recent context:*\n\`\`\`${trimmedContext}\`\`\`\n`;
  }

  return header + contextBlock + footer;
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { formatMessage };
