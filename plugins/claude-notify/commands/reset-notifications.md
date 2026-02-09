---
description: "Completely remove notification config for this project (clean slate)"
allowed-tools: ["Bash", "Read", "AskUserQuestion", "Glob"]
---

# Reset Notifications

Completely removes the notification config for a project, giving a clean slate to re-run `/setup-notifications`.

## Step 0: Determine the project directory

The config file lives at `<PROJECT_DIR>/.claude/notification-config.json`. Determine the project directory:

1. First, check the current working directory for `.claude/notification-config.json`
2. If not found, search for notification configs in subdirectories: look for `*/.claude/notification-config.json` patterns
3. If multiple are found, use AskUserQuestion to ask which project to reset
4. If none are found anywhere, tell the user there are no notification configs to remove and stop

## Step 1: Show current config

Read the found `notification-config.json` and show the user a brief summary: project path, channel, topic_id, enabled status.

## Step 2: Confirm deletion

Use AskUserQuestion to confirm:

**Question: "Delete <PATH>/notification-config.json? This removes all notification settings for this project."**
- header: "Confirm"
- options:
  - **Yes, delete it** — "Remove the config file completely. You can re-run /setup-notifications to set up fresh."
  - **No, keep it** — "Cancel — don't delete anything"

## Step 3: Delete the file

If confirmed, delete using the full absolute path:

```!
rm -f "<FULL_ABSOLUTE_PATH>/notification-config.json"
```

## Step 4: Verify and confirm

Verify it's gone:

```!
test -f "<FULL_ABSOLUTE_PATH>/notification-config.json" && echo "STILL EXISTS" || echo "DELETED"
```

Tell the user:
```
Notification config removed from <PROJECT_NAME>.

To set up notifications again from scratch, run /setup-notifications
from inside that project directory.

Note: Your global env vars (CLAUDE_NOTIFY_TG_TOKEN, CLAUDE_NOTIFY_TG_GROUP_ID, etc.)
are still set in ~/.zshrc — those are shared across projects and were not removed.
```
