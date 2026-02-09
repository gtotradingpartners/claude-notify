---
description: "Send a test notification to verify your Telegram/Slack setup"
allowed-tools: ["Bash", "Read", "AskUserQuestion", "Glob"]
---

# Test Notifications

Run the claude-notify test script to verify the notification setup for the current project.

**IMPORTANT: You MUST use the node test script as described below. Do NOT improvise your own curl commands, polling loops, or any other approach. The node script handles everything — sending, sound, and reply polling.**

## Step 0: Find the project

Look for `notification-config.json` to determine which project to test:

1. Check the current working directory: `.claude/notification-config.json`
2. If not found, search subdirectories: `*/.claude/notification-config.json`
3. If multiple found, use AskUserQuestion to ask which project to test
4. If none found, tell the user to run `/setup-notifications` first and stop here

Store the project directory as `PROJECT_DIR` (absolute path).

## Step 1: Show config summary

Read `<PROJECT_DIR>/.claude/notification-config.json` and show the user a brief summary: channel, events enabled, reply-back status, history lines.

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
