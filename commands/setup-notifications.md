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
  - **Slack** — "Messages sent to a Slack channel. Best for team use. Requires a bot token and channel ID."

## Step 3: Verify Credentials

Based on the channel choice:

**For Telegram:**
- Check if `CLAUDE_NOTIFY_TG_TOKEN` env var is set: `test -n "$CLAUDE_NOTIFY_TG_TOKEN"`
- Check if `CLAUDE_NOTIFY_TG_GROUP_ID` env var is set: `test -n "$CLAUDE_NOTIFY_TG_GROUP_ID"`
- If either is missing, tell the user:
  ```
  You need to set these environment variables (add to ~/.zshrc or ~/.bashrc):

  export CLAUDE_NOTIFY_TG_TOKEN="your-bot-token"      # Get from @BotFather on Telegram
  export CLAUDE_NOTIFY_TG_GROUP_ID="your-group-id"     # Negative number like -1001234567890

  To get your group ID:
  1. Add your bot to the group
  2. Send a message in the group
  3. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
  4. Find the chat.id in the response
  ```
  Then ask if they want to continue setup (config will work once env vars are set) or stop.

**For Slack:**
- Check if `CLAUDE_NOTIFY_SLACK_TOKEN` env var is set
- Check if `CLAUDE_NOTIFY_SLACK_CHANNEL` env var is set (or a project-specific one)
- If missing, tell the user:
  ```
  You need to set these environment variables:

  export CLAUDE_NOTIFY_SLACK_TOKEN="xoxb-your-bot-token"   # From Slack App OAuth
  export CLAUDE_NOTIFY_SLACK_CHANNEL="C0123456789"          # Channel ID from Slack

  To set up:
  1. Create a Slack app at https://api.slack.com/apps
  2. Add OAuth scopes: chat:write, channels:history, channels:read
  3. Install to workspace and copy the Bot User OAuth Token
  4. Get the channel ID from the channel's "About" panel
  ```

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

For Telegram, set `topic_id: null` to auto-create a forum topic on first notification.

Write the config to `$CWD/.claude/notification-config.json`. Create the `.claude/` directory if it doesn't exist.

## Step 10: Confirm and Test

Tell the user:
1. Config saved to `.claude/notification-config.json`
2. Add `.claude/notification-config.json` to `.gitignore` (it may contain project-specific settings)
3. Suggest running `/test-notifications` to verify the setup
4. Remind them that the topic will be auto-created in their Telegram group on the first notification

Show a summary of what was configured.
