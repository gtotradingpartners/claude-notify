const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  enabled: false,
  channel: 'telegram',
  events: {
    Notification: true,
    Stop: true,
    SubagentStop: false,
  },
  notification_types: {
    permission_prompt: true,
    idle_prompt: true,
    elicitation_dialog: true,
    auth_success: false,
  },
  telegram: {
    bot_token_env: 'CLAUDE_NOTIFY_TG_TOKEN',
    group_id_env: 'CLAUDE_NOTIFY_TG_GROUP_ID',
    topic_id: null,
  },
  slack: {
    bot_token_env: 'CLAUDE_NOTIFY_SLACK_TOKEN',
    channel_env: 'CLAUDE_NOTIFY_SLACK_CHANNEL',
    channel_id: null,
    auto_create_channel: false,
  },
  sound: 'default',
  sounds: {},
  platform_sound: true,
  include_history: false,
  history_lines: 10,
  wait_for_reply: false,
  reply_timeout: 120,
  project_label: '',
};

function getConfigPath(projectDir) {
  return path.join(projectDir, '.claude', 'notification-config.json');
}

function loadConfig(projectDir) {
  const configPath = getConfigPath(projectDir);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, enabled: false, _configPath: configPath, _projectDir: projectDir };
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    process.stderr.write(`claude-notify: failed to parse ${configPath}: ${e.message}\n`);
    return { ...DEFAULT_CONFIG, enabled: false, _configPath: configPath, _projectDir: projectDir };
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...raw,
    telegram: { ...DEFAULT_CONFIG.telegram, ...(raw.telegram || {}) },
    slack: { ...DEFAULT_CONFIG.slack, ...(raw.slack || {}) },
    events: { ...DEFAULT_CONFIG.events, ...(raw.events || {}) },
    notification_types: { ...DEFAULT_CONFIG.notification_types, ...(raw.notification_types || {}) },
    sounds: { ...DEFAULT_CONFIG.sounds, ...(raw.sounds || {}) },
    _configPath: configPath,
    _projectDir: projectDir,
  };

  // Resolve env vars for Telegram
  config.telegram.bot_token = process.env[config.telegram.bot_token_env] || '';
  config.telegram.group_id = process.env[config.telegram.group_id_env] || '';

  // Resolve env vars for Slack
  config.slack.bot_token = process.env[config.slack.bot_token_env] || '';
  // channel can come from env var OR from auto-created channel_id in config
  config.slack.channel = config.slack.channel_id || process.env[config.slack.channel_env] || '';

  // Auto-detect project label from git or dirname
  if (!config.project_label) {
    config.project_label = detectProjectLabel(projectDir);
  }

  return config;
}

function detectProjectLabel(projectDir) {
  // Try git repo name first
  try {
    const gitConfigPath = path.join(projectDir, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
      const urlMatch = gitConfig.match(/url\s*=\s*.*\/([^/\s]+?)(?:\.git)?\s*$/m);
      if (urlMatch) return urlMatch[1];
    }
  } catch (_) {
    // ignore
  }
  // Fall back to directory name
  return path.basename(projectDir);
}

function saveTopicId(config, topicId) {
  const configPath = config._configPath;
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) {
    // ignore
  }

  if (!raw.telegram) raw.telegram = {};
  raw.telegram.topic_id = topicId;

  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
}

function saveSlackChannelId(config, channelId) {
  const configPath = config._configPath;
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) {
    // ignore
  }

  if (!raw.slack) raw.slack = {};
  raw.slack.channel_id = channelId;

  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
}

module.exports = { loadConfig, saveTopicId, saveSlackChannelId, DEFAULT_CONFIG };
