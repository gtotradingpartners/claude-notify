---
description: "Set up notification alerts (Telegram/Slack) for this project"
allowed-tools: ["AskUserQuestion", "Write", "Read", "Bash", "Glob"]
---

# Setup Notifications for This Project

You are configuring the **claude-notify** plugin for the current project. This will create a `.claude/notification-config.json` file that controls how and when notifications are sent.

## Step 0: Determine the project directory

Before anything else, figure out which project to configure. Use AskUserQuestion:

**Question: "Which project do you want to set up notifications for?"**
- header: "Project"
- options:
  - **Current directory** — "Use the current working directory as the project"
  - **Choose a subdirectory** — "Pick from projects in the current directory"

If "Current directory": use the current working directory as the project path.

If "Choose a subdirectory": list directories in the current working directory that look like projects (have a `.git/` or `src/` or `package.json`). Use AskUserQuestion to let the user pick one.

Store the chosen path as `PROJECT_DIR` — all references to `.claude/notification-config.json` below mean `<PROJECT_DIR>/.claude/notification-config.json`. Use absolute paths throughout.

## Step 1: Check for Existing Config

Check if `<PROJECT_DIR>/.claude/notification-config.json` already exists. If it does, read it and tell the user their current settings, then ask if they want to reconfigure or keep them.

## Step 2: Choose Notification Channel

Use AskUserQuestion to ask:

**Question: "Which notification channel do you want to use for this project?"**
- header: "Channel"
- options:
  - **Telegram** — "Messages sent to a Telegram group topic. Best for personal use. Requires a bot token and group ID."
  - **Slack** — "Messages sent to a Slack channel. Best for team use. Requires a bot token."

## Step 3: Channel Setup (Telegram or Slack)

### If Telegram:

Telegram requires three things: a **bot token**, a **group ID**, and a **topic ID**.

The bot token and group ID are **shared across all your projects** (one bot, one group). They're stored as env vars in ~/.zshrc so every project can use them. The topic ID is **per-project** — each project gets its own topic thread in the group.

If this is your first time setting up, you'll configure all three. If you've already set up another project, the bot token and group ID will already be there and you'll only need a new topic.

#### Step 3a: Bot Token

Check if bot token is set: `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_TG_TOKEN" && echo "SET" || echo "MISSING"`

**If the token is SET:** use AskUserQuestion to ask:

**Question: "A global bot token is already configured. Use it for this project?"**
- header: "Bot token"
- options:
  - **Use global token (Recommended)** — "Use the bot token from CLAUDE_NOTIFY_TG_TOKEN (shared across projects)"
  - **Use a different bot for this project** — "Set a project-specific bot token stored in this project's config"

If "Use global token": skip to Step 3b.

If "Use a different bot for this project": ask them to paste the token (same flow as MISSING below). Instead of saving to ~/.zshrc, store it as `telegram.bot_token_value` in the project config (Step 9). Tell the user this token is only for this project.

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

Confirm the token is now set. Tell the user: "This bot token is saved globally — it will be shared across all your projects."

#### Step 3b: Group and Topic

Telegram uses a group with **Topics** (forum mode) enabled. Each project gets its own topic thread. We need both a **group ID** and a **topic ID** — both come from a single topic URL.

Check if group ID is already set: `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_TG_GROUP_ID" && echo "SET" || echo "MISSING"`

**If the group ID is SET:** use AskUserQuestion to ask:

**Question: "A global group ID is already configured. Use the same group for this project?"**
- header: "Group"
- options:
  - **Use same group (Recommended)** — "Send this project's notifications to the same Telegram group as your other projects"
  - **Use a different group for this project** — "Set a project-specific group (from a different topic URL)"

If "Use same group": ask about the topic:

**Question: "Do you already have a topic for this project in your Telegram group?"**
- header: "Topic"
- options:
  - **Yes, I have a topic** — "I already created a topic for this project"
  - **No, I need to create one** — "Show me how to create a topic in my group"

If "No, I need to create one": show the topic creation instructions below, then continue to Step 3c.
If "Yes": skip straight to Step 3c (get topic URL).

If "Use a different group": continue to the full group+topic setup below (same as MISSING flow). When saving in Step 3c, store the group ID as `telegram.group_id_value` in the project config instead of ~/.zshrc.

**If the group ID is MISSING:** this is the first-time setup. Use AskUserQuestion to ask:

**Question: "Do you already have a Telegram group with Topics enabled?"**
- header: "Group"
- options:
  - **Yes, I have a group** — "I already have a Telegram group with Topics (forum mode) enabled"
  - **No, I need to create one** — "Show me how to create a group from scratch"

If "No, I need to create one": tell the user:
```
How to create a Telegram group for notifications:

1. Open Telegram on your phone or desktop
2. Tap the compose/new message button → "New Group"
3. Add at least one member (you can add your bot now, or add it later)
4. Give the group a name (e.g. "Claude Notifications")
5. After the group is created, enable Topics:
   - Tap the group name at the top
   - Tap "Edit" (pencil icon)
   - Toggle ON "Topics" (this enables forum mode — each project gets its own topic thread)
6. Add your bot to the group (if you haven't already):
   - Tap the group name → "Add Members"
   - Search for your bot by its @username and add it
7. Make your bot an admin:
   - In group settings → "Administrators" → "Add Admin" → select your bot → Confirm
```

For both cases (already has a group, or just created one), tell them to create a topic:

```
Now create a topic for this project:

1. Open your Telegram group
2. Tap the "+" or "Create Topic" button
3. Name it after your project (e.g. "HypeForm" or "my-project")
4. The topic is now created — you'll see it as a thread in the group
```

If group is new, also tell them:
```
Make sure your bot is in the group as an admin:
  - If not added yet: group settings → "Add Members" → search for @YourBotName
  - Then: group settings → "Administrators" → "Add Admin" → select your bot → Confirm
```

#### Step 3c: Get Topic URL (extracts both Group ID and Topic ID)

Now ask the user to get the topic URL. Tell them:

```
I need the topic URL to extract your group ID and topic ID. Here's how to get it:

On phone (iOS/Android):
  1. Open your group and go into the topic you created
  2. Tap the topic name at the top of the screen
  3. Look for "Share" or "Copy Link" — or long-press the topic name
  4. Copy the link

On Telegram Desktop:
  1. Open your group and find the topic in the list
  2. Right-click the topic name → "Copy Topic Link"

On web.telegram.org:
  1. Open the group and click the topic
  2. Copy the URL from the browser address bar

The link will look like: https://t.me/c/1234567890/42
```

Use AskUserQuestion with freeform input:

**Question: "Paste the topic URL (format: https://t.me/c/NUMBERS/NUMBER):"**
- header: "Topic URL"
- options:
  - **I can't find the link** — "I'm having trouble getting the topic URL"

If "I can't find the link": offer manual entry as fallback — ask them to enter group_id and topic_id separately (they may know these from other sources).

If they paste a URL: parse it to extract the IDs. The format is `https://t.me/c/<GROUP_NUMBER>/<TOPIC_ID>`:
- **Group ID** = `-100` prepended to the first number (e.g. `1234567890` → `-1001234567890`)
- **Topic ID** = the second number (e.g. `42`)

Validate the parsed values look correct (group_id should be a large negative number starting with `-100`, topic_id should be a positive integer). Show the user:

```
Parsed from URL:
  Group ID: -1001234567890
  Topic ID: 42
```

**If the group ID env var is NOT already set** (first-time setup), save it globally:
```
echo 'export CLAUDE_NOTIFY_TG_GROUP_ID="<PARSED_GROUP_ID>"' >> ~/.zshrc
source ~/.zshrc
```
Tell the user: "Group ID saved globally — all your projects will use this group."

**If the group ID env var IS already set**, verify the parsed group ID matches the existing one. If it matches, no action needed — tell the user "Group ID matches your existing global setting."

If it differs AND the user chose "Use same group" in Step 3b: warn them — this topic URL is from a different group than their global setting. Ask if they pasted the right URL. Offer to retry.

If it differs AND the user chose "Use a different group for this project" in Step 3b: this is expected. Store the parsed group ID as `telegram.group_id_value` in the project config (Step 9) instead of updating ~/.zshrc.

The topic ID will be saved directly into the project config (Step 9).

#### Step 3d: Verify Telegram Setup

Send a test message to confirm everything works. Build the curl command using the **actual values** collected during this setup — do NOT rely on env var interpolation, since project-specific values aren't in env vars:

- **Bot token**: use the project-specific token if one was set in Step 3a, otherwise read from env: `source ~/.zshrc 2>/dev/null; echo $CLAUDE_NOTIFY_TG_TOKEN`
- **Group ID**: use the parsed group ID from Step 3c (or project-specific override)
- **Topic ID**: use the parsed topic ID from Step 3c

Run (substituting the actual values directly into the command):
```!
curl -s -X POST "https://api.telegram.org/bot<ACTUAL_BOT_TOKEN>/sendMessage" -H "Content-Type: application/json" -d '{"chat_id": "<ACTUAL_GROUP_ID>", "message_thread_id": <ACTUAL_TOPIC_ID>, "text": "✅ claude-notify setup verified! This project is connected.", "parse_mode": "HTML"}'
```

Check the response. If `ok: true`: tell the user setup is verified and they should see the message in their topic.

If it fails: check the error and help debug:
- `"chat not found"` → group ID is wrong, or bot is not in the group
- `"message thread not found"` → topic ID is wrong
- `"bot was kicked"` → bot was removed from the group, re-add it
- Other errors → show the raw error and suggest the user double-check their setup

Tell the user:
```
Telegram is configured:
  ✓ Bot token: <global or project-specific>
  ✓ Group ID: <GROUP_ID> <global or project-specific>
  ✓ Topic ID: <TOPIC_ID>
  ✓ Test message sent successfully
```

Proceed to Step 4.

### If Slack:

Check if `CLAUDE_NOTIFY_SLACK_TOKEN` env var is set: `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_SLACK_TOKEN" && echo "SET" || echo "MISSING"`

**If the token is SET:** use AskUserQuestion to ask:

**Question: "A global Slack bot token is already configured. Use it for this project?"**
- header: "Slack token"
- options:
  - **Use global token (Recommended)** — "Use the bot token from CLAUDE_NOTIFY_SLACK_TOKEN (shared across projects)"
  - **Use a different bot for this project** — "Set a project-specific Slack bot token stored in this project's config"

If "Use global token": skip to the channel setup below.

If "Use a different bot for this project": ask them to paste the token (same flow as MISSING below). Instead of saving to ~/.zshrc, store it as `slack.bot_token_value` in the project config (Step 9).

**If the token is MISSING:** use AskUserQuestion to ask:

**Question: "Do you already have a Slack Bot token?"**
- header: "Slack bot"
- options:
  - **Yes, I have a token** — "I already created a Slack app and have the Bot User OAuth Token (starts with xoxb-)"
  - **No, I need to create one** — "Show me how to create a Slack app and get a token"

If "No, I need to create one": tell the user:
```
How to create a Slack Bot token:

1. Go to https://api.slack.com/apps and click "Create New App" → "From scratch"
2. Name it (e.g. "Claude Notify") and select your workspace
3. Go to "OAuth & Permissions" and add these Bot Token OAuth Scopes:
   - chat:write       — send notification messages
   - channels:history  — read thread replies (for reply-back)
   - channels:read     — list channels (for auto-create lookup)
   - channels:manage   — create channels (only needed if you want auto-created channels)
4. Click "Install to Workspace" and authorize
5. Copy the "Bot User OAuth Token" (starts with xoxb-)
```

For both cases (already has token, or just created one), use AskUserQuestion with freeform input:

**Question: "Paste your Slack Bot User OAuth Token (starts with xoxb-):"**
- header: "Token"
- options:
  - **I've already set it in ~/.zshrc** — "I already added export CLAUDE_NOTIFY_SLACK_TOKEN=... to my shell profile"

If they pick "I've already set it in ~/.zshrc": run `source ~/.zshrc` and re-check. If still missing, tell them to verify the export line exists in ~/.zshrc.

If they paste a token: save it by running:
```
echo 'export CLAUDE_NOTIFY_SLACK_TOKEN="<THEIR_TOKEN>"' >> ~/.zshrc
source ~/.zshrc
```

Confirm the token is now set. Tell the user: "This Slack token is saved globally — it will be shared across all your projects."

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
  - **Yes, 5 messages (Recommended)** — "Include the last 5 human/assistant exchanges for context"
  - **Yes, 2 messages** — "Just the most recent back-and-forth, keeps notifications short"
  - **Yes, 10 messages** — "More context, but notifications will be longer"
  - **No context** — "Just the notification alert, no conversation history"

History includes only text messages (human and assistant). Thinking blocks, tool calls, and other internal details are excluded. Individual messages are truncated to 500 characters.

## Step 6: Configure Reply-Back

Use AskUserQuestion to ask:

**Question: "Enable reply-back? This lets you reply from Telegram/Slack and Claude receives your response."**
- header: "Reply-back"
- options:
  - **Yes, 30 minute timeout (Recommended)** — "Claude waits up to 30 minutes for your reply. Good for stepping away briefly."
  - **Yes, 2 hour timeout** — "Claude waits up to 2 hours. Good if you might be away for a while."
  - **Yes, 5 minute timeout** — "Short wait, for when you're actively monitoring from your phone."
  - **No reply-back** — "One-way notifications only. You must return to the terminal to respond."

Explain how reply-back works:
- **Permission/idle notifications**: Claude is already waiting for your input. The timeout just controls how long it waits for a Telegram/Slack reply before giving up. Since Claude was blocked anyway, a longer timeout costs nothing.
- **Stop events**: Your reply prevents Claude from stopping — Claude continues with your reply as new instructions. The terminal is frozen during the wait.
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
  - **No** — "Only the local macOS sound plays. Telegram messages arrive silently (disable_notification). Not supported for Slack."

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

**For Telegram config (using global env vars):**
```json
"telegram": {
  "bot_token_env": "CLAUDE_NOTIFY_TG_TOKEN",
  "group_id_env": "CLAUDE_NOTIFY_TG_GROUP_ID",
  "topic_id": <PARSED_TOPIC_ID>
}
```

**For Telegram config (with project-specific overrides):**
If the user chose a project-specific bot token and/or group in Step 3a/3b, add the direct values:
```json
"telegram": {
  "bot_token_env": "CLAUDE_NOTIFY_TG_TOKEN",
  "bot_token_value": "<PROJECT_SPECIFIC_TOKEN>",
  "group_id_env": "CLAUDE_NOTIFY_TG_GROUP_ID",
  "group_id_value": "<PROJECT_SPECIFIC_GROUP_ID>",
  "topic_id": <PARSED_TOPIC_ID>
}
```
Only include `bot_token_value` if they chose a project-specific bot. Only include `group_id_value` if they chose a project-specific group. These override the env vars when present.

`topic_id` is the number parsed from the topic URL in Step 3c. If the user skipped topic setup, use `null` (messages go to the General topic).

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

**For Slack with project-specific overrides:**
If the user chose a project-specific bot token in the Slack setup, add the direct value:
```json
"slack": {
  "bot_token_env": "CLAUDE_NOTIFY_SLACK_TOKEN",
  "bot_token_value": "<PROJECT_SPECIFIC_TOKEN>",
  "auto_create_channel": true,
  "channel_id": null
}
```
Only include `bot_token_value` if they chose a project-specific bot. It overrides the env var when present.

Write the config to `<PROJECT_DIR>/.claude/notification-config.json` (the project directory chosen in Step 0). Use the absolute path. Create the `.claude/` directory if it doesn't exist.

## Step 10: Confirm and Test

Tell the user:
1. Config saved to `.claude/notification-config.json`
2. Check that `.claude/notification-config.json` is in your `.gitignore` (it may contain project-specific topic/channel IDs)
3. **Important**: If you just added env vars, restart your terminal or run `source ~/.zshrc` before testing
4. Run `/test-notifications` to verify everything works
5. For Slack with auto-create: a `#claude-<project>` channel will be created on first notification (or test)

Show a summary of what was configured, including:
- Channel type
- Which events are enabled
- History: on/off and how many messages
- Reply-back: on/off and timeout
- Sound: which sound + platform sound on/off
- Project label
