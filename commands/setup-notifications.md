---
description: "Set up notification alerts (Telegram/Slack) for this project"
allowed-tools: ["AskUserQuestion", "Write", "Read", "Bash", "Glob"]
---

# Setup Notifications for This Project

You are configuring the **claude-notify** plugin for the current project. This will create a `.claude/notification-config.json` file that controls how and when notifications are sent.

## Step 1: Check for Existing Config

First check if `.claude/notification-config.json` already exists in the current project directory. If it does, read it and tell the user their current settings, then ask if they want to reconfigure or keep them.

## Step 2: Choose Notification Channel

Use AskUserQuestion to ask:

**Question: "Which notification channel do you want to use for this project?"**
- header: "Channel"
- options:
  - **Telegram** — "Messages sent to a Telegram group topic. Best for personal use. Requires a bot token and group ID."
  - **Slack** — "Messages sent to a Slack channel. Best for team use. Requires a bot token."

## Step 3: Channel Setup (Telegram or Slack)

### If Telegram:

Check if `CLAUDE_NOTIFY_TG_TOKEN` env var is set: `test -n "$CLAUDE_NOTIFY_TG_TOKEN"` and `test -n "$CLAUDE_NOTIFY_TG_GROUP_ID"`

If the bot token is missing, tell the user:
```
You need a Telegram bot token. Create one via @BotFather on Telegram.
Then add to ~/.zshrc:  export CLAUDE_NOTIFY_TG_TOKEN="your-bot-token"
```

Then ask about the group:

**Question: "How do you want to set up the Telegram group?"**
- header: "TG Group"
- options:
  - **Use existing group (Recommended)** — "Provide the group ID of an existing Telegram group with forum topics enabled. The bot must be an admin in the group."
  - **I need help creating one** — "Show me step-by-step instructions for creating a Telegram group with forum topics and getting the group ID."

If "Use existing group": check if `CLAUDE_NOTIFY_TG_GROUP_ID` is set. If not, explain how to set it.

If "I need help creating one": show these instructions:
```
1. Open Telegram and create a new Group
2. Add your bot (@YourBotName) to the group
3. Go to Group Settings → Edit → Toggle ON "Topics"
4. Make your bot an admin (needed for creating topics)
5. Send any message in the group
6. Visit: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
7. Find "chat":{"id":-100XXXXXXXXXX} — that negative number is your group ID
8. Add to ~/.zshrc:  export CLAUDE_NOTIFY_TG_GROUP_ID="-100XXXXXXXXXX"
```
Then ask if they want to continue setup now (config will work once the env var is set) or pause.

**Note:** A Forum Topic will be auto-created for this project on the first notification. The topic name will match the project label. `topic_id` in the config will be set to `null` (auto-create).

### If Slack:

Check if `CLAUDE_NOTIFY_SLACK_TOKEN` env var is set: `test -n "$CLAUDE_NOTIFY_SLACK_TOKEN"`

If the bot token is missing, tell the user:
```
You need a Slack Bot token.
1. Create a Slack app at https://api.slack.com/apps
2. Add these Bot Token OAuth scopes:
   - chat:write (send messages)
   - channels:history, channels:read (read replies)
   - channels:manage (only if you want auto-created channels)
3. Install the app to your workspace
4. Copy the "Bot User OAuth Token" (starts with xoxb-)
5. Add to ~/.zshrc:  export CLAUDE_NOTIFY_SLACK_TOKEN="xoxb-..."
```

Then ask about the channel:

**Question: "How should the Slack channel be set up for this project?"**
- header: "Slack channel"
- options:
  - **Use existing channel** — "Provide a channel ID you've already created. Set CLAUDE_NOTIFY_SLACK_CHANNEL env var."
  - **Auto-create channel (Recommended)** — "Automatically create a #claude-<project-name> channel. Requires channels:manage scope."

If "Use existing channel": check if a Slack channel env var is set. If not, explain:
```
Set the channel ID in your env:
  export CLAUDE_NOTIFY_SLACK_CHANNEL="C0123456789"

Find the channel ID: open the channel in Slack → click the channel name → scroll to the bottom of the "About" panel.
```

If "Auto-create channel": set `auto_create_channel: true` in the config. The channel will be created as `#claude-<project-label>` on the first notification. No channel env var needed.

## Step 4: Configure Notification Events

Use AskUserQuestion to ask:

**Question: "Which events should trigger notifications?"**
- header: "Events"
- multiSelect: true
- options:
  - **Permission prompts** — "When Claude needs permission to run a tool (Recommended)"
  - **Idle/waiting** — "When Claude has been waiting for input for 60+ seconds (Recommended)"
  - **Task completion** — "When Claude finishes a response (Stop event)"
  - **Subagent completion** — "When a subagent finishes (usually noisy, off by default)"

## Step 5: Configure History Context

Use AskUserQuestion to ask:

**Question: "Should notifications include recent conversation context?"**
- header: "History"
- options:
  - **Yes, 10 messages (Recommended)** — "Include the last 10 human/assistant exchanges for context"
  - **Yes, 5 messages** — "Shorter context, keeps Telegram messages smaller"
  - **No context** — "Just the notification message, no history"

## Step 6: Configure Reply-Back

Use AskUserQuestion to ask:

**Question: "Enable reply-back? This lets you reply to notifications and Claude receives your response."**
- header: "Reply-back"
- options:
  - **Yes, 2 minute timeout (Recommended)** — "Claude waits up to 2 minutes for your reply before proceeding"
  - **Yes, 5 minute timeout** — "Longer wait time for when you might be away"
  - **No reply-back** — "Notifications are one-way only. Simpler but you must return to the terminal."

## Step 7: Configure Sounds

Use AskUserQuestion to ask:

**Question: "Choose a local macOS alert sound for notifications:"**
- header: "Sound"
- options:
  - **Glass (Recommended)** — "Gentle chime, good for most notifications"
  - **Hero** — "Triumphant sound, good for task completion"
  - **Ping** — "Quick, attention-getting ping"
  - **Silent** — "No local sound, just the Telegram/Slack notification"

## Step 8: Project Label

Use AskUserQuestion to ask:

**Question: "What label should appear in notification messages for this project?"**
- header: "Label"
- options:
  - **Auto-detect (Recommended)** — "Use the git repo name or directory name automatically"
  - **Custom label** — "Enter a custom name for this project in notifications"

If the user picks "Custom label", ask them to type the label using AskUserQuestion with a freeform input option.

## Step 9: Generate Config

Based on all answers, generate the `notification-config.json` file. Map the answers:

- Channel → `channel`
- Permission prompts → `notification_types.permission_prompt`
- Idle/waiting → `notification_types.idle_prompt`
- Task completion → `events.Stop`
- Subagent completion → `events.SubagentStop`
- History → `include_history` + `history_lines`
- Reply-back → `wait_for_reply` + `reply_timeout`
- Sound → `sound` + `sounds` (use the chosen sound for Notification, Hero for Stop)
- Label → `project_label` (empty string for auto-detect)

**For Telegram:** set `topic_id: null` to auto-create a forum topic on first notification.

**For Slack with auto-create:** set `auto_create_channel: true` and `channel_id: null`. The channel `#claude-<project-label>` will be created on first notification and the `channel_id` will be saved back to the config.

**For Slack with existing channel:** set `auto_create_channel: false` and leave `channel_id: null` (resolved from env var at runtime).

Write the config to `$CWD/.claude/notification-config.json`. Create the `.claude/` directory if it doesn't exist.

## Step 10: Confirm and Test

Tell the user:
1. Config saved to `.claude/notification-config.json`
2. Add `.claude/notification-config.json` to `.gitignore` (it may contain project-specific settings)
3. Suggest running `/test-notifications` to verify the setup
4. For Telegram: remind that a topic will be auto-created in their group on the first notification
5. For Slack with auto-create: remind that a `#claude-<project>` channel will be created on first notification

Show a summary of what was configured.
