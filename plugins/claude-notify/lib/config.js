const fs = require('fs');
const path = require('path');
const os = require('os');

// All configs stored under ~/.claude/claude-notify/ — never touches project directories.
// This avoids macOS TCC privacy prompts when projects are in Desktop, Documents, Google Drive, etc.
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const NOTIFY_DIR = path.join(CLAUDE_DIR, 'claude-notify');
const CONFIGS_DIR = path.join(NOTIFY_DIR, 'configs');

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
  send_delay: 10,
  sound: 'default',
  sounds: {},
  platform_sound: true,
  include_history: false,
  history_lines: 10,
  wait_for_reply: false,
  reply_timeout: 120,
  project_label: '',
};

// Encode project path to a directory name: /Users/aaron/foo → -Users-aaron-foo
// Same pattern Claude Code uses for ~/.claude/projects/
function encodeProjectPath(projectDir) {
  return path.resolve(projectDir).replace(/\//g, '-');
}

function getConfigPath(projectDir) {
  const encoded = encodeProjectPath(projectDir);
  return path.join(CONFIGS_DIR, encoded, 'notification-config.json');
}

function loadConfig(projectDir) {
  const configPath = getConfigPath(projectDir);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, _configPath: configPath, _projectDir: projectDir };
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    process.stderr.write(`claude-notify: failed to parse ${configPath}: ${e.message}\n`);
    return { ...DEFAULT_CONFIG, _configPath: configPath, _projectDir: projectDir };
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

  // Resolve Telegram credentials: per-project direct values take priority over env vars
  config.telegram.bot_token = config.telegram.bot_token_value
    || process.env[config.telegram.bot_token_env] || '';
  config.telegram.group_id = config.telegram.group_id_value
    || process.env[config.telegram.group_id_env] || '';

  // Resolve Slack credentials: per-project direct values take priority over env vars
  config.slack.bot_token = config.slack.bot_token_value
    || process.env[config.slack.bot_token_env] || '';
  // channel can come from env var OR from auto-created channel_id in config
  config.slack.channel = config.slack.channel_id || process.env[config.slack.channel_env] || '';

  // Project label: use configured value or fall back to directory basename
  if (!config.project_label) {
    config.project_label = path.basename(projectDir);
  }

  return config;
}

function updateConfigField(configPath, section, key, value) {
  // Ensure the config directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) {
    // ignore — start from empty object
  }

  if (!raw[section]) raw[section] = {};
  raw[section][key] = value;

  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
}

function saveSlackChannelId(config, channelId) {
  updateConfigField(config._configPath, 'slack', 'channel_id', channelId);
}

module.exports = { loadConfig, saveSlackChannelId, getConfigPath, CONFIGS_DIR };
