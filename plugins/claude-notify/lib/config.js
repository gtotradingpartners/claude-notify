const fs = require('fs');
const path = require('path');
const os = require('os');

// macOS directories that trigger TCC privacy prompts when accessed
const HOME = os.homedir();
const PROTECTED_DIRS = [
  path.join(HOME, 'Desktop'),
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Downloads'),
  path.join(HOME, 'Library'),
  path.join(HOME, 'Library', 'CloudStorage'),  // Google Drive, iCloud, OneDrive, Dropbox
];

function isProtectedPath(dir) {
  const resolved = path.resolve(dir);
  // Check if dir IS or is INSIDE a protected macOS directory
  // (but allow ~/.claude/ which is inside home but not protected)
  for (const protectedDir of PROTECTED_DIRS) {
    if (resolved === protectedDir || resolved.startsWith(protectedDir + '/')) {
      return true;
    }
  }
  // Also catch cloud storage mounted elsewhere
  if (resolved.includes('/CloudStorage/') || resolved.includes('/Google Drive/')) {
    return true;
  }
  return false;
}

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

function getConfigPath(projectDir) {
  return path.join(projectDir, '.claude', 'notification-config.json');
}

function loadConfig(projectDir) {
  const configPath = getConfigPath(projectDir);

  // Skip filesystem access for macOS-protected directories to avoid TCC privacy prompts
  if (isProtectedPath(projectDir)) {
    return { ...DEFAULT_CONFIG, _configPath: configPath, _projectDir: projectDir };
  }

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

  // Auto-detect project label from git or dirname
  if (!config.project_label) {
    config.project_label = detectProjectLabel(projectDir);
  }

  return config;
}

function detectProjectLabel(projectDir) {
  // Try git repo name first (skip for protected dirs to avoid TCC prompts)
  if (!isProtectedPath(projectDir)) {
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
  }
  // Fall back to directory name
  return path.basename(projectDir);
}

function updateConfigField(configPath, section, key, value) {
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

module.exports = { loadConfig, saveSlackChannelId };
