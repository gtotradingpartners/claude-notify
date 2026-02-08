const EVENT_EMOJI = {
  permission_prompt: '\u{1F510}',  // 🔐
  idle_prompt: '\u{1F4A4}',        // 💤
  elicitation_dialog: '\u{1F514}', // 🔔
  auth_success: '\u{2705}',        // ✅
  Stop: '\u{1F6D1}',              // 🛑
  SubagentStop: '\u{1F539}',      // 🔹
};

const TELEGRAM_MAX_LENGTH = 4096;
const HISTORY_MSG_MAX_LENGTH = 500;

function formatMessage(hookInput, config, historyContext) {
  if (config.channel === 'telegram') {
    return formatTelegramHTML(hookInput, config, historyContext);
  }
  return formatSlackMrkdwn(hookInput, config, historyContext);
}

function formatTelegramHTML(hookInput, config, historyContext) {
  const eventName = hookInput.hook_event_name;
  const project = config.project_label;
  const sessionId = hookInput.session_id || 'unknown';

  let emoji, title, body;

  if (eventName === 'Notification') {
    const notifType = hookInput.notification_type || 'unknown';
    emoji = EVENT_EMOJI[notifType] || '\u{1F514}';
    title = `Notification: ${notifType}`;
    body = hookInput.message || '';
  } else if (eventName === 'Stop') {
    emoji = EVENT_EMOJI.Stop;
    title = 'Claude has stopped';
    body = 'The main agent finished responding.';
  } else if (eventName === 'SubagentStop') {
    emoji = EVENT_EMOJI.SubagentStop;
    const agentType = hookInput.agent_type || 'unknown';
    title = `Subagent stopped (${agentType})`;
    body = `Agent ${hookInput.agent_id || ''} finished.`;
  } else {
    emoji = '\u{1F514}';
    title = eventName;
    body = hookInput.message || '';
  }

  let msg = `${emoji} <b>${escapeHTML(title)}</b>\n`;
  msg += `<b>Project:</b> ${escapeHTML(project)}\n`;
  msg += `<b>Session:</b> <code>${escapeHTML(sessionId)}</code>\n\n`;
  msg += `${escapeHTML(body)}\n`;

  if (historyContext) {
    msg += `\n<b>Recent context:</b>\n<pre>${escapeHTML(historyContext)}</pre>\n`;
  }

  if (config.wait_for_reply) {
    msg += `\n<i>Reply to this message to send instructions to Claude.</i>`;
  }

  // Truncate to Telegram limit
  if (msg.length > TELEGRAM_MAX_LENGTH) {
    msg = msg.substring(0, TELEGRAM_MAX_LENGTH - 20) + '\n...[truncated]';
  }

  return msg;
}

function formatSlackMrkdwn(hookInput, config, historyContext) {
  const eventName = hookInput.hook_event_name;
  const project = config.project_label;
  const sessionId = hookInput.session_id || 'unknown';

  let emoji, title, body;

  if (eventName === 'Notification') {
    const notifType = hookInput.notification_type || 'unknown';
    emoji = EVENT_EMOJI[notifType] || '\u{1F514}';
    title = `Notification: ${notifType}`;
    body = hookInput.message || '';
  } else if (eventName === 'Stop') {
    emoji = EVENT_EMOJI.Stop;
    title = 'Claude has stopped';
    body = 'The main agent finished responding.';
  } else if (eventName === 'SubagentStop') {
    emoji = EVENT_EMOJI.SubagentStop;
    const agentType = hookInput.agent_type || 'unknown';
    title = `Subagent stopped (${agentType})`;
    body = `Agent ${hookInput.agent_id || ''} finished.`;
  } else {
    emoji = '\u{1F514}';
    title = eventName;
    body = hookInput.message || '';
  }

  let msg = `${emoji} *${title}*\n`;
  msg += `*Project:* ${project}\n`;
  msg += `*Session:* \`${sessionId}\`\n\n`;
  msg += `${body}\n`;

  if (historyContext) {
    msg += `\n*Recent context:*\n\`\`\`${historyContext}\`\`\`\n`;
  }

  if (config.wait_for_reply) {
    msg += `\n_Reply in thread to send instructions to Claude._`;
  }

  return msg;
}

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { formatMessage, HISTORY_MSG_MAX_LENGTH };
