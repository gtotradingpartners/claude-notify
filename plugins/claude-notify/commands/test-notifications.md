---
description: "Send a test notification to verify your Telegram/Slack setup"
allowed-tools: ["Bash", "Read", "AskUserQuestion", "Glob"]
---

# Test Notifications

Run the claude-notify test script to verify the notification setup for the current project.

**IMPORTANT: You MUST use the node test script as described below. Do NOT improvise your own curl commands, polling loops, or any other approach. The node script handles everything — sending, sound, and reply polling.**

**Config location:** `~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

## Step 0: Find the project

Use the current working directory as the project. Compute the config path:
`~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

Check if the config file exists. Also check the legacy location (`<PROJECT_DIR>/.claude/notification-config.json`). If neither exists, tell the user to run `/setup-notifications` first and stop here.

Store the project directory as `PROJECT_DIR` (absolute path).

## Step 1: Show config summary

Read the config file and show the user a brief summary: channel, events enabled, reply-back status, history lines.

## Step 2: Run the test

Run the test by executing this exact command — do NOT modify it or replace it with your own implementation. Substitute `<PROJECT_DIR>` with the absolute path from Step 0:

```!
source ~/.zshrc 2>/dev/null; source ~/.bashrc 2>/dev/null; CLAUDE_PROJECT_DIR="<PROJECT_DIR>" node "${CLAUDE_PLUGIN_ROOT}/index.js" --test
```

This single command does EVERYTHING:
- Checks env vars and config
- Sends a test notification to Telegram/Slack
- Plays the local macOS sound
- If `wait_for_reply` is enabled, polls for a reply (this may take a while — that's normal)

## Step 3: Wait and report

Wait for the command to finish. If `wait_for_reply` is enabled, tell the user:
```
The test is waiting for your reply. Go to your Telegram/Slack topic and
reply to the test notification message. Just type your reply directly in
the topic — no need to @ the bot.
```

Report the results. If the test succeeded, confirm notifications are working. If it failed (missing env vars, API errors), show the error and explain what needs to be fixed.
