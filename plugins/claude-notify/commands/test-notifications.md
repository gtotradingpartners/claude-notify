---
description: "Send a test notification to verify your Telegram/Slack setup"
allowed-tools: ["Bash", "Read"]
---

# Test Notifications

Run the claude-notify test mode to verify the notification setup for the current project.

## Steps

1. First, check if `.claude/notification-config.json` exists in the current project. If not, tell the user to run `/setup-notifications` first.

2. If it exists, read it and show the user a brief summary of their config (channel, events, reply-back status).

3. Run the test (source the shell profile first to pick up env vars that may have been added this session):

```!
source ~/.zshrc 2>/dev/null; source ~/.bashrc 2>/dev/null; node "${CLAUDE_PLUGIN_ROOT}/index.js" --test
```

4. Report the results to the user. If the test succeeded, confirm notifications are working. If it failed (missing env vars, API errors), explain what needs to be fixed.

5. If the user has `wait_for_reply` enabled and the test is waiting for a reply, tell them to reply in Telegram/Slack to complete the test.
