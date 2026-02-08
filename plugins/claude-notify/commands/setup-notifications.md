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

Telegram requires two things: a **bot token** and a **group ID**. This section will check for each and walk the user through setting them up if missing.

#### Step 3a: Bot Token

Check if bot token is set: `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_TG_TOKEN" && echo "SET" || echo "MISSING"`

**If the token is SET:** tell the user their bot token is configured and skip to Step 3b.

**If the token is MISSING:** use AskUserQuestion to ask:

**Question: "Do you already have a Telegram bot?"**
- header: "Bot"
- options:
  - **Yes, I have a bot token** — "I created a bot via @BotFather and have the token ready"
  - **No, I need to create one** — "Show me how to create a Telegram bot"

If "No, I need to create one": tell the user:
```
How to create a Telegram bot:

1. Open Telegram on your phone or desktop
2. Search for @BotFather and start a chat with it
3. Send the message: /newbot
4. BotFather asks for a display name — type anything (e.g. "Claude Alerts")
5. BotFather asks for a username — must end in "bot" (e.g. "my_claude_alerts_bot")
6. BotFather replies with your bot token — it looks like:
     123456789:ABCDefGhIJKlmNoPQRsTUVwxyz
7. Copy that entire token string
```

For both cases (already has token, or just created one), use AskUserQuestion with freeform input:

**Question: "Paste your bot token (format: 123456789:ABCDefGh...):"**
- header: "Token"
- options:
  - **I've already set it in ~/.zshrc** — "I already added export CLAUDE_NOTIFY_TG_TOKEN=... to my shell profile"

If they pick "I've already set it in ~/.zshrc": run `source ~/.zshrc` and re-check. If still missing, tell them to verify the export line exists in ~/.zshrc.

If they type/paste a token: save it by running:
```
echo 'export CLAUDE_NOTIFY_TG_TOKEN="<THEIR_TOKEN>"' >> ~/.zshrc
source ~/.zshrc
```

Confirm the token is now set.

#### Step 3b: Group and Group ID

Check if group ID is set: `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_TG_GROUP_ID" && echo "SET" || echo "MISSING"`

**If the group ID is SET:** tell the user their group ID is configured and skip to Step 3c.

**If the group ID is MISSING:** use AskUserQuestion to ask:

**Question: "Do you have a Telegram group for notifications?"**
- header: "Group"
- options:
  - **Yes, I have a group** — "I have a group with my bot added to it"
  - **No, I need to create one** — "Show me how to create a group"

If "No, I need to create one": tell the user:
```
How to create a Telegram group for notifications:

1. Open Telegram
2. Tap the compose/new message button → "New Group"
3. Add your bot (search for its @username) as a member
4. Give the group a name (e.g. "Claude Notifications")
5. After the group is created, open group settings:
   - Tap the group name at the top
   - Tap "Edit" (pencil icon)
   - Scroll down and toggle ON "Topics"
     (This enables forum mode — each project gets its own topic thread)
6. Make your bot an admin:
   - In group settings, tap "Administrators"
   - Tap "Add Admin" and select your bot
   - Confirm
```

If "Yes, I have a group": remind them:
```
Make sure:
  - Your bot is a member of the group
  - Your bot is an admin (needed to create topic threads)
  - "Topics" is enabled in group settings (Group → Edit → Topics)
```

**Now find the group ID automatically:**

Tell the user:
```
Now send any message in your Telegram group (just type "hello" or anything).
This lets your bot detect the group.
```

Use AskUserQuestion to ask:

**Question: "Have you sent a message in the group?"**
- header: "Message sent"
- options:
  - **Yes, I sent a message** — "I just sent a message in the group"

Once confirmed, query the bot API to find the group. Run:
```
source ~/.zshrc 2>/dev/null; curl -s "https://api.telegram.org/bot${CLAUDE_NOTIFY_TG_TOKEN}/getUpdates?offset=-10"
```

Parse the JSON response. Look for entries where `result[].message.chat.type` is `"group"` or `"supergroup"`. For each unique group found, extract:
- `message.chat.id` — the numeric group ID (negative number starting with -100)
- `message.chat.title` — the group name

**If groups are found:** show them like:
```
Found these groups your bot is in:

  Group: "Claude Notifications"
  ID: -1001234567890
```

If multiple groups found, use AskUserQuestion to let the user pick the right one. If only one, confirm it.

Then save the group ID by running:
```
echo 'export CLAUDE_NOTIFY_TG_GROUP_ID="<GROUP_ID>"' >> ~/.zshrc
source ~/.zshrc
```

**If NO groups are found:** tell the user:
```
No groups found in your bot's recent updates. This usually means:
  - The message hasn't reached the bot yet — wait a few seconds and try again
  - Your bot isn't in the group — add it as a member first
  - Too much time passed — Telegram only keeps recent updates, so send a fresh message

Would you like to try again?
```
Use AskUserQuestion to offer retry or manual entry. For manual entry, ask them to paste the group ID directly (they may know it from another source).

#### Step 3c: Confirm Telegram Setup

Tell the user:
```
Telegram is configured:
  ✓ Bot token set
  ✓ Group ID set

A forum topic will be auto-created in your group for this project on the
first notification. The topic name will match the project label.
```

Proceed to Step 4.

### If Slack:

Check if `CLAUDE_NOTIFY_SLACK_TOKEN` env var is set: `test -n "$CLAUDE_NOTIFY_SLACK_TOKEN"`

If the bot token is missing, tell the user:
```
You need a Slack Bot token:
1. Go to https://api.slack.com/apps and click "Create New App" → "From scratch"
2. Name it (e.g. "Claude Notify") and select your workspace
3. Go to "OAuth & Permissions" and add these Bot Token OAuth Scopes:
   - chat:write       — send notification messages
   - channels:history  — read thread replies (for reply-back)
   - channels:read     — list channels (for auto-create lookup)
   - channels:manage   — create channels (only needed if you want auto-created channels)
4. Click "Install to Workspace" and authorize
5. Copy the "Bot User OAuth Token" (starts with xoxb-)
6. Add to your shell profile:
   echo 'export CLAUDE_NOTIFY_SLACK_TOKEN="xoxb-..."' >> ~/.zshrc
   source ~/.zshrc
```

Then ask about the channel:

**Question: "How should the Slack channel be set up for this project?"**
- header: "Slack channel"
- options:
  - **Auto-create channel (Recommended)** — "Automatically create a #claude-<project-name> channel on first notification. Requires channels:manage scope."
  - **Use existing channel** — "Use a channel you've already created. Requires setting the CLAUDE_NOTIFY_SLACK_CHANNEL env var."

If "Use existing channel": check if `CLAUDE_NOTIFY_SLACK_CHANNEL` env var is set: `test -n "$CLAUDE_NOTIFY_SLACK_CHANNEL"`. If not, explain:
```
Set the channel ID (NOT the channel name):
  echo 'export CLAUDE_NOTIFY_SLACK_CHANNEL="C0123456789"' >> ~/.zshrc
  source ~/.zshrc

To find the channel ID:
  1. Open the channel in Slack
  2. Click the channel name at the top
  3. Scroll to the bottom of the "About" panel — the ID starts with C
```
Also remind: make sure the bot is invited to the channel (`/invite @YourBotName` in the channel).

If "Auto-create channel": set `auto_create_channel: true` in the config. The channel will be created as `#claude-<project-label>` on the first notification and the channel ID will be saved back to the config. No channel env var needed.

## Step 4: Configure Notification Events

Use AskUserQuestion to ask:

**Question: "Which events should trigger notifications?"**
- header: "Events"
- multiSelect: true
- options:
  - **Permission prompts (Recommended)** — "When Claude needs your permission to run a tool (e.g. Bash command)"
  - **Idle/waiting (Recommended)** — "When Claude has been waiting for input for 60+ seconds"
  - **Elicitation dialogs** — "When Claude presents a question dialog that needs your response"
  - **Task completion** — "When Claude finishes a response (Stop event). Useful if you walk away."

Then use AskUserQuestion to ask:

**Question: "Should subagent completions also trigger notifications?"**
- header: "Subagents"
- options:
  - **No (Recommended)** — "Skip subagent notifications. They fire frequently and can be noisy."
  - **Yes** — "Get notified when any subagent finishes its work."

Map these to config fields:
- Permission prompts → `notification_types.permission_prompt`
- Idle/waiting → `notification_types.idle_prompt`
- Elicitation dialogs → `notification_types.elicitation_dialog`
- Task completion → `events.Stop`
- Subagent completions → `events.SubagentStop`

Note: `notification_types.auth_success` is always set to `false` by default (not useful for most users).

## Step 5: Configure History Context

Use AskUserQuestion to ask:

**Question: "Should notifications include recent conversation context?"**
- header: "History"
- options:
  - **Yes, 10 messages (Recommended)** — "Include the last 10 human/assistant exchanges so you can see what Claude was doing"
  - **Yes, 5 messages** — "Shorter context, keeps messages smaller"
  - **No context** — "Just the notification alert, no conversation history"

History includes only text messages (human and assistant). Thinking blocks, tool calls, and other internal details are excluded. Individual messages are truncated to 500 characters.

## Step 6: Configure Reply-Back

Use AskUserQuestion to ask:

**Question: "Enable reply-back? This lets you reply from Telegram/Slack and Claude receives your response."**
- header: "Reply-back"
- options:
  - **Yes, 2 minute timeout (Recommended)** — "Claude waits up to 2 minutes for your reply before proceeding"
  - **Yes, 5 minute timeout** — "Longer wait time for when you might be away"
  - **No reply-back** — "One-way notifications only. You must return to the terminal to respond."

Explain how reply-back works:
- **Permission/idle notifications**: Your reply is passed to Claude as additional context
- **Stop events**: Your reply prevents Claude from stopping — Claude continues with your reply as new instructions
- **Timeout**: If you don't reply in time, Claude proceeds normally (no follow-up message is sent)
- **Telegram**: Reply to the notification message in the topic thread
- **Slack**: Reply in the message thread (not the channel)

## Step 7: Configure Sounds

Use AskUserQuestion to ask:

**Question: "Choose a local macOS alert sound for notifications:"**
- header: "Sound"
- options:
  - **Glass (Recommended)** — "Gentle chime, good for most notifications"
  - **Hero** — "Triumphant sound, good for task completion"
  - **Ping** — "Quick, attention-getting ping"
  - **Silent** — "No local macOS sound, rely on Telegram/Slack notification sounds only"

Then use AskUserQuestion to ask:

**Question: "Should Telegram/Slack also play their notification sound?"**
- header: "Platform sound"
- options:
  - **Yes (Recommended)** — "Both local macOS sound AND Telegram/Slack notification sound play"
  - **No** — "Only the local macOS sound plays. Telegram/Slack messages arrive silently (disable_notification)."

Map: "No" → `platform_sound: false`, "Yes" → `platform_sound: true`

The chosen sound is used for all Notification events. Stop events always use "Hero" sound. The `sounds` field in config allows per-event overrides.

## Step 8: Project Label

Use AskUserQuestion to ask:

**Question: "What label should appear in notification messages for this project?"**
- header: "Label"
- options:
  - **Auto-detect (Recommended)** — "Use the git repo name or directory name automatically"
  - **Custom label** — "Enter a custom name for this project in notifications"

If the user picks "Custom label", ask them to type the label using AskUserQuestion with a freeform input option.

Auto-detect tries the git remote URL repo name first, then falls back to the directory name.

The project label is also used for:
- Telegram: the auto-created forum topic name
- Slack: the auto-created channel name (#claude-<label>)

## Step 9: Generate Config

Based on all answers, generate the `notification-config.json` file.

**Always set these fields:**
- `enabled: true`
- `channel` → "telegram" or "slack"
- `events.Notification: true` (always enabled since notification_types controls the subtypes)
- `events.Stop` → from Step 4
- `events.SubagentStop` → from Step 4
- `notification_types.permission_prompt` → from Step 4
- `notification_types.idle_prompt` → from Step 4
- `notification_types.elicitation_dialog` → from Step 4
- `notification_types.auth_success: false` (always off)
- `include_history` + `history_lines` → from Step 5
- `wait_for_reply` + `reply_timeout` → from Step 6
- `sound` → chosen sound name from Step 7
- `sounds` → `{ "Notification": "<chosen>", "Stop": "Hero" }`
- `platform_sound` → from Step 7
- `project_label` → empty string `""` for auto-detect, or the custom label

**For Telegram config:**
```json
"telegram": {
  "bot_token_env": "CLAUDE_NOTIFY_TG_TOKEN",
  "group_id_env": "CLAUDE_NOTIFY_TG_GROUP_ID",
  "topic_id": null
}
```
`topic_id: null` means a forum topic will be auto-created on first notification and the ID saved back here.

**For Slack with auto-create:**
```json
"slack": {
  "bot_token_env": "CLAUDE_NOTIFY_SLACK_TOKEN",
  "auto_create_channel": true,
  "channel_id": null
}
```
The channel `#claude-<project-label>` will be created on first notification and `channel_id` saved back.

**For Slack with existing channel:**
```json
"slack": {
  "bot_token_env": "CLAUDE_NOTIFY_SLACK_TOKEN",
  "channel_env": "CLAUDE_NOTIFY_SLACK_CHANNEL",
  "auto_create_channel": false,
  "channel_id": null
}
```
The channel ID is read from the `CLAUDE_NOTIFY_SLACK_CHANNEL` env var at runtime.

Write the config to `$CWD/.claude/notification-config.json`. Create the `.claude/` directory if it doesn't exist.

**Reference:** Example configs are available in the plugin at `examples/telegram-with-reply.json`, `examples/slack-auto-create.json`, etc.

## Step 10: Confirm and Test

Tell the user:
1. Config saved to `.claude/notification-config.json`
2. Check that `.claude/notification-config.json` is in your `.gitignore` (it may contain project-specific topic/channel IDs)
3. **Important**: If you just added env vars, restart your terminal or run `source ~/.zshrc` before testing
4. Run `/test-notifications` to verify everything works
5. For Telegram: a topic will be auto-created in your group on the first notification (or test)
6. For Slack with auto-create: a `#claude-<project>` channel will be created on first notification (or test)

Show a summary of what was configured, including:
- Channel type
- Which events are enabled
- History: on/off and how many messages
- Reply-back: on/off and timeout
- Sound: which sound + platform sound on/off
- Project label
