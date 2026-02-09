# claude-notify

Bidirectional notification hooks for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Get alerts on Telegram or Slack when Claude needs your input or finishes work — and reply directly from the notification to keep Claude going without returning to the terminal.

## How It Works

```
                         Claude Code fires a hook event
                         (Notification / Stop / SubagentStop)
                                      |
                                      v
                    +----------------------------------+
                    |  Hook runs via /bin/sh            |
                    |  zsh -c '... node index.js'      |
                    +----------------------------------+
                                      |
                                      v
                    +----------------------------------+
                    |  Read JSON from stdin             |
                    |  (event type, session_id,         |
                    |   transcript_path, message, ...)  |
                    +----------------------------------+
                                      |
                                      v
                    +----------------------------------+
                    |  Load project config              |
                    |  $PROJECT/.claude/                |
                    |    notification-config.json       |
                    +----------------------------------+
                                      |
                         enabled? ----+---- no --> exit 0
                              |
                              v
                    +----------------------------------+
                    |  Event/type filter check          |
                    |  (skip disabled events)           |
                    +----------------------------------+
                              |
                              v
                    +----------------------------------+
                    |  Optional send_delay (seconds)    |
                    +----------------------------------+
                              |
                              v
                    +----------------------------------+
                    |  Parse transcript for context     |
                    |  (if include_history enabled)     |
                    +----------------------------------+
                              |
                              v
               +--------------+--------------+
               |                             |
               v                             v
    +-------------------+         +-------------------+
    |  Play macOS sound |         |  Format message   |
    |  (fire & forget)  |         |  (HTML or mrkdwn) |
    +-------------------+         +-------------------+
                                         |
                                         v
                              +-------------------+
                              |  Send to Telegram  |
                              |  or Slack          |
                              +-------------------+
                                         |
                              Can reply? -+- no --> exit 0
                                         |
                                         v
                              +-------------------+
                              |  Poll for reply    |
                              |  (5s intervals)    |
                              |                   |
                              |  Also watching     |
                              |  transcript mtime  |
                              |  for terminal      |
                              |  input             |
                              +-------------------+
                                    |         |
                            reply   |         | timeout or
                            arrives |         | terminal input
                                    v         v
                              +---------+  exit 0
                              | Output  |  (silent)
                              | JSON to |
                              | stdout  |
                              +---------+
                                    |
                     +--------------+--------------+
                     |                             |
                     v                             v
          Stop/SubagentStop              Notification (idle)
          {                              {
            "decision": "block",           "hookSpecificOutput": {
            "reason": "Human               "hookEventName":
              replied via                    "Notification",
              telegram: ..."               "additionalContext":
          }                                  "Human replied via
          Claude continues                    telegram: ..."
          with reply as                    }
          instructions                   }
                                         Claude receives
                                         reply as context
```

## Features

- **Telegram & Slack** — choose per project
- **Bidirectional replies** — reply from Telegram/Slack, Claude receives your response
- **Per-project config** — different projects can have different channels, sounds, and settings
- **Forum topics (Telegram)** — one topic per project in a shared group
- **Channel per project (Slack)** — auto-creates `#claude-<project>` channels
- **Conversation context** — optionally include recent messages so you know what Claude was doing
- **Multi-message support** — long context is split across multiple messages (respects Telegram's 4096 char limit)
- **Terminal-aware polling** — detects if you respond in the terminal and stops polling Telegram/Slack
- **macOS sounds** — local alert sounds via `afplay`
- **Zero dependencies** — pure Node.js, no npm install needed

## Supported Events

| Event | Description | Reply-back? |
|-------|-------------|-------------|
| Permission prompt | Claude needs permission to run a tool | No (requires terminal UI) |
| Idle/waiting | Claude has been waiting for input 60+ seconds | Yes |
| Elicitation dialog | Claude presents a question with options | No (requires terminal UI) |
| Task completion (Stop) | Claude finished responding | Yes (blocks stop, Claude continues) |
| Subagent completion | A subagent finished (off by default) | Yes (blocks stop) |

**Why some events don't support reply-back:** Permission prompts and elicitation dialogs present structured UI widgets in the terminal (allow/deny buttons, multiple-choice options). Claude Code ignores `additionalContext` for these events — the terminal dialog must be interacted with directly. Notifications are still sent so you know something needs attention.

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- Node.js (any recent version — uses only built-in modules)
- A Telegram bot token OR a Slack bot token (setup guided by `/setup-notifications`)

### Install the Plugin

```bash
# 1. Add the marketplace
claude plugin marketplace add https://github.com/gtotradingpartners/claude-notify.git

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

Credentials are stored as environment variables by default (shared across projects). For project-specific overrides, values can optionally be stored directly in the project's config file.

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
- Create a topic for each project (e.g. "HypeForm", "my-api")
- **Group ID + Topic ID:** both are extracted from the topic URL during setup
  - Share/copy the topic link: `https://t.me/c/1234567890/42`
  - Group ID = `-100` + first number: `-1001234567890`
  - Topic ID = second number: `42`

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
    "topic_id": 42
  },
  "send_delay": 10,
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
| `send_delay` | `10` | Seconds to wait before sending notification (0 = immediate) |
| `sound` | `"default"` | macOS sound name (Glass, Hero, Ping, Basso, Pop, Submarine) |
| `sounds` | `{}` | Per-event sound overrides |
| `platform_sound` | `true` | If `false`, Telegram/Slack messages arrive silently |
| `include_history` | `false` | Include recent conversation context |
| `history_lines` | `10` | Number of recent messages to include |
| `wait_for_reply` | `false` | Block and poll for reply from notification channel |
| `reply_timeout` | `120` | Seconds to wait for a reply |
| `project_label` | `""` | Empty = auto-detect from git/dirname |

**Set during setup:**
- `telegram.topic_id` — parsed from topic URL during `/setup-notifications`

**Auto-populated fields** (don't set these manually):
- `slack.channel_id` — set after first notification auto-creates the Slack channel

## How Reply-Back Works

When `wait_for_reply` is enabled, the behavior depends on the event type:

### Events that support reply-back

1. **Stop events**: Claude was about to stop. Your reply blocks the stop — Claude continues with your reply as new instructions. This is the primary use case: you see "Claude has stopped", reply with "now run the tests", and Claude keeps going.

2. **Idle prompt** (`notification_type: idle_prompt`): Claude has been waiting 60+ seconds for input. Your reply is passed as `additionalContext` — Claude receives it and continues.

### Events that notify only (no reply-back)

3. **Permission prompts**: Claude needs you to allow/deny a tool use. The terminal shows a structured allow/deny dialog that requires direct interaction — Telegram/Slack replies are ignored by Claude Code for this event type.

4. **Elicitation dialogs**: Claude presents a question with specific answer options. The terminal shows a choice dialog that must be answered directly — `additionalContext` is ignored.

For these events, the notification message says "Respond directly in Claude Code" instead of "Reply to this message."

### Terminal-aware polling

When polling for a reply, the hook watches the transcript file's modification time. If you respond in the terminal while it's polling, it detects the change and stops polling immediately — your terminal response takes priority.

### Timeout and loop prevention

- **Timeout**: If you don't reply within `reply_timeout` seconds, Claude proceeds normally. No follow-up message is sent.
- **Loop prevention**: When a Stop hook fires during an active reply cycle (`stop_hook_active=true`), the notification is still sent but reply polling is skipped. This prevents an infinite Stop -> reply -> continue -> Stop -> reply loop.

## Commands

| Command | Description |
|---------|-------------|
| `/claude-notify:setup-notifications` | Interactive setup wizard (includes Telegram bot/group setup) |
| `/claude-notify:test-notifications` | Send a test notification and verify reply-back |
| `/claude-notify:disable-notifications` | Disable notifications for the current project |
| `/claude-notify:reset-notifications` | Completely remove notification config (clean slate) |

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
│       │   ├── reset-notifications.md
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

### Hook not firing at all

Claude Code runs hooks via `/bin/sh` (POSIX shell), **not** bash or zsh. This causes two common issues:

1. **`source ~/.zshrc` fails silently** — zsh syntax in `.zshrc` causes `/bin/sh` to exit with code 1, killing the entire hook. The plugin works around this by wrapping the command in `zsh -c '...'`.

2. **Node.js not in PATH** — Homebrew installs node at `/opt/homebrew/bin/node`, which isn't in `/bin/sh`'s default PATH. The plugin explicitly adds `/opt/homebrew/bin` to PATH.

If you're having issues, check the log file at `~/.claude/claude-notify.log`. If it doesn't exist, the hook isn't executing at all — check `claude plugin list` and restart Claude Code.

### Debugging

- **Log file**: `~/.claude/claude-notify.log` — written on every hook invocation
- **Crash log**: `~/.claude/claude-notify-crash.log` — written on uncaught exceptions
- **Claude debug mode**: Run `claude --debug` for detailed hook execution logs
- **Verbose mode**: Press `Ctrl+O` in Claude Code to see hook output in the transcript
- **Verify registration**: Type `/hooks` in Claude Code to see registered hooks
- **Manual test**: `echo '{"hook_event_name":"Stop","session_id":"test"}' | zsh -c 'source ~/.zshrc 2>/dev/null; CLAUDE_PROJECT_DIR=/path/to/project node /path/to/index.js'`

### "Unknown skill" when running /setup-notifications

- Make sure the plugin is installed: `claude plugin list` should show `claude-notify@claude-notify` as enabled
- If not, re-run the install commands above
- Restart Claude Code after installing

### Env vars not being picked up

- Run `source ~/.zshrc` (or restart your terminal) after adding env vars
- Verify with: `echo $CLAUDE_NOTIFY_TG_TOKEN`

### Telegram: "chat not found" or "message thread not found"

- Verify the group ID is correct (negative number starting with `-100`)
- Verify the topic ID matches the topic you created
- Your bot must be a **member** of the group (admin recommended)
- Re-run `/setup-notifications` to re-parse from the topic URL

### Slack: "Missing scope" errors

- Go to your Slack app settings > OAuth & Permissions
- Add the missing scope, then reinstall the app to your workspace
- Get a new bot token if needed

### No sound playing

- macOS only — sounds use `afplay` and `/System/Library/Sounds/`
- Check the sound name exists: `ls /System/Library/Sounds/`

### "2 stop hooks" or duplicate hooks

- Other plugins with Stop hooks (e.g. ralph-loop) will cause this
- Uninstall conflicting plugins: `claude plugin uninstall <plugin-name>`
- Check for stale symlinks in `~/.claude/hooks/`
- `claude plugin install` for any plugin may re-add previously uninstalled plugins — check `installed_plugins.json` after installs

### Updating the plugin after code changes

```bash
claude plugin update claude-notify@claude-notify
```
Then restart Claude Code. Hooks are snapshotted at startup — code changes are not picked up until restart.

## License

MIT
