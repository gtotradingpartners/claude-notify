# claude-notify

Bidirectional notification hooks for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Get alerts on Telegram or Slack when Claude needs your input or finishes work — and reply directly from the notification to keep Claude going without returning to the terminal.

## Features

- **Telegram & Slack** — choose per project
- **Bidirectional replies** — reply from Telegram/Slack, Claude receives your response
- **Per-project config** — different projects can have different channels, sounds, and settings
- **Forum topics (Telegram)** — one topic per project in a shared group, auto-created
- **Channel per project (Slack)** — auto-creates `#claude-<project>` channels
- **Conversation context** — optionally include recent messages so you know what Claude was doing
- **macOS sounds** — local alert sounds via `afplay`
- **Zero dependencies** — pure Node.js, no npm install needed

## Supported Events

| Event | Description |
|-------|-------------|
| Permission prompt | Claude needs permission to run a tool |
| Idle/waiting | Claude has been waiting for input 60+ seconds |
| Elicitation dialog | Claude presents a question that needs your response |
| Task completion (Stop) | Claude finished responding |
| Subagent completion | A subagent finished (noisy, off by default) |

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- Node.js (any recent version — uses only built-in modules)
- A Telegram bot token OR a Slack bot token (setup guided by `/setup-notifications`)

### Install the Plugin

```bash
# 1. Add the marketplace (from GitHub or a local clone)
claude plugin marketplace add https://github.com/YOUR_USERNAME/claude-notify.git

# Or if you cloned locally:
claude plugin marketplace add /path/to/claude-notify

# 2. Install the plugin globally
claude plugin install claude-notify@claude-notify --scope user

# 3. Enable it (should be automatic, but just in case)
claude plugin enable claude-notify@claude-notify
```

### Set Up a Project

In any project directory, run the interactive setup command:

```
/setup-notifications
```

This walks you through:
1. Choosing Telegram or Slack
2. Configuring credentials (env vars)
3. Selecting which events trigger notifications
4. History context, reply-back, sounds, and project label

The setup creates `.claude/notification-config.json` in the project.

### Verify It Works

```
/test-notifications
```

Sends a test notification and (if reply-back is enabled) waits for your reply.

## Environment Variables

Credentials are stored as environment variables, never in config files.

### Telegram

| Variable | Description |
|----------|-------------|
| `CLAUDE_NOTIFY_TG_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) (format: `123456789:ABCDefGh...`) |
| `CLAUDE_NOTIFY_TG_GROUP_ID` | Group chat ID (negative number, e.g. `-1001234567890`) |

```bash
# Add to ~/.zshrc or ~/.bashrc
export CLAUDE_NOTIFY_TG_TOKEN="your-bot-token"
export CLAUDE_NOTIFY_TG_GROUP_ID="-100XXXXXXXXXX"
```

**Telegram setup requirements:**
- Create a group with **Topics** (forum mode) enabled
- Add your bot to the group and make it an **admin**
- A forum topic is auto-created per project on first notification
- **To find your group ID:** Run `/claude-notify:find-group-id` — it walks you through the entire process interactively

### Slack

| Variable | Description |
|----------|-------------|
| `CLAUDE_NOTIFY_SLACK_TOKEN` | Bot User OAuth Token (starts with `xoxb-`) |
| `CLAUDE_NOTIFY_SLACK_CHANNEL` | Channel ID (optional — only if not using auto-create) |

```bash
export CLAUDE_NOTIFY_SLACK_TOKEN="xoxb-..."
# Optional: only needed if NOT using auto-create channels
export CLAUDE_NOTIFY_SLACK_CHANNEL="C0123456789"
```

**Required Slack OAuth scopes:**
- `chat:write` — send messages
- `channels:history` — read thread replies (for reply-back)
- `channels:read` — list channels
- `channels:manage` — create channels (only for auto-create)

## Configuration

Each project has its own `.claude/notification-config.json`. Here's a full example:

```json
{
  "enabled": true,
  "channel": "telegram",
  "events": {
    "Notification": true,
    "Stop": true,
    "SubagentStop": false
  },
  "notification_types": {
    "permission_prompt": true,
    "idle_prompt": true,
    "elicitation_dialog": true,
    "auth_success": false
  },
  "telegram": {
    "bot_token_env": "CLAUDE_NOTIFY_TG_TOKEN",
    "group_id_env": "CLAUDE_NOTIFY_TG_GROUP_ID",
    "topic_id": null
  },
  "sound": "Glass",
  "sounds": {
    "Notification": "Glass",
    "Stop": "Hero"
  },
  "platform_sound": true,
  "include_history": true,
  "history_lines": 10,
  "wait_for_reply": true,
  "reply_timeout": 120,
  "project_label": ""
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Master on/off switch |
| `channel` | `"telegram"` | `"telegram"` or `"slack"` |
| `events` | Stop+Notification on | Which hook events trigger notifications |
| `notification_types` | all on except auth_success | Filter which Notification subtypes fire |
| `sound` | `"default"` | macOS sound name (Glass, Hero, Ping, Basso, Pop, Submarine) |
| `sounds` | `{}` | Per-event sound overrides |
| `platform_sound` | `true` | If `false`, Telegram/Slack messages arrive silently |
| `include_history` | `false` | Include recent conversation context |
| `history_lines` | `10` | Number of recent messages to include |
| `wait_for_reply` | `false` | Block and poll for reply from notification channel |
| `reply_timeout` | `120` | Seconds to wait for a reply |
| `project_label` | `""` | Empty = auto-detect from git/dirname |

**Auto-populated fields** (don't set these manually):
- `telegram.topic_id` — set after first notification auto-creates the forum topic
- `slack.channel_id` — set after first notification auto-creates the Slack channel

## How Reply-Back Works

When `wait_for_reply` is enabled:

1. **Notification events** (permission prompt, idle, elicitation): Claude is already waiting for input. Your reply is passed as additional context — Claude receives it and continues.

2. **Stop events**: Claude was about to stop. Your reply blocks the stop — Claude continues with your reply as new instructions.

3. **Timeout**: If you don't reply within `reply_timeout` seconds, Claude proceeds normally. No follow-up message is sent.

4. **Loop prevention**: When a Stop hook fires during an active reply cycle (`stop_hook_active=true`), notifications are still sent but reply polling is skipped to prevent infinite loops.

## Commands

| Command | Description |
|---------|-------------|
| `/claude-notify:setup-notifications` | Interactive setup wizard for the current project |
| `/claude-notify:test-notifications` | Send a test notification and verify reply-back |
| `/claude-notify:disable-notifications` | Disable notifications for the current project |
| `/claude-notify:find-group-id` | Find your Telegram group ID interactively (bot token + group discovery) |

## Project Structure

```
claude-notify/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest (for plugin installation)
├── plugins/
│   └── claude-notify/            # The plugin itself
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin metadata
│       ├── commands/             # Slash commands
│       │   ├── setup-notifications.md
│       │   ├── test-notifications.md
│       │   └── disable-notifications.md
│       ├── hooks/
│       │   └── hooks.json        # Hook registrations (Notification, Stop, SubagentStop)
│       ├── examples/             # Example notification-config.json files
│       ├── lib/
│       │   ├── config.js         # Config loader + defaults + auto-save
│       │   ├── formatter.js      # Message formatting (Telegram HTML / Slack mrkdwn)
│       │   ├── telegram.js       # Telegram Bot API client
│       │   ├── slack.js          # Slack Web API client
│       │   ├── transcript.js     # Conversation history parser
│       │   └── sound.js          # macOS sound playback
│       ├── index.js              # Main entry point
│       └── package.json
└── README.md
```

## Troubleshooting

**"Unknown skill" when running /setup-notifications**
- Make sure the plugin is installed: `claude plugin list` should show `claude-notify@claude-notify` as enabled
- If not, re-run the install commands above
- Restart Claude Code after installing

**Env vars not being picked up**
- Run `source ~/.zshrc` (or restart your terminal) after adding env vars
- Verify with: `echo $CLAUDE_NOTIFY_TG_TOKEN`

**Telegram: "Failed to create forum topic"**
- Your bot must be an **admin** in the group
- The group must have **Topics** enabled (Group Settings > Edit > Topics)
- Verify the group ID is correct (negative number starting with `-100`)

**Slack: "Missing scope" errors**
- Go to your Slack app settings > OAuth & Permissions
- Add the missing scope, then reinstall the app to your workspace
- Get a new bot token if needed

**No sound playing**
- macOS only — sounds use `afplay` and `/System/Library/Sounds/`
- Check the sound name exists: `ls /System/Library/Sounds/`

**Updating the plugin after code changes**
```bash
claude plugin update claude-notify@claude-notify
```
Then restart Claude Code.

## License

MIT
