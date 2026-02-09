---
description: "Completely remove notification config for this project (clean slate)"
allowed-tools: ["Bash", "Read", "AskUserQuestion", "Glob"]
---

# Reset Notifications

Completely removes the notification config for a project, giving a clean slate to re-run `/setup-notifications`.

**Config location:** `~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

## Step 0: Determine the project directory

Use the current working directory as the project. Compute the config path:
`~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

Check if the config file exists. Also check the legacy location (`<PROJECT_DIR>/.claude/notification-config.json`). If neither exists, tell the user there is no notification config to remove and stop.

## Step 1: Show current config

Read the found config file and show the user a brief summary: project path, channel, topic_id, enabled status.

## Step 2: Confirm deletion

Use AskUserQuestion to confirm:

**Question: "Delete notification config for this project? This removes all notification settings."**
- header: "Confirm"
- options:
  - **Yes, delete it** — "Remove the config file completely. You can re-run /setup-notifications to set up fresh."
  - **No, keep it** — "Cancel — don't delete anything"

## Step 3: Delete the file

If confirmed, delete using the full absolute path:

```!
rm -f "<FULL_CONFIG_PATH>"
```

If a legacy config also exists at `<PROJECT_DIR>/.claude/notification-config.json`, delete that too.

## Step 4: Verify and confirm

Verify it's gone:

```!
test -f "<FULL_CONFIG_PATH>" && echo "STILL EXISTS" || echo "DELETED"
```

Tell the user:
```
Notification config removed.

To set up notifications again from scratch, run /setup-notifications
from inside that project directory.

Note: Your global env vars (CLAUDE_NOTIFY_TG_TOKEN, CLAUDE_NOTIFY_TG_GROUP_ID, etc.)
are still set in ~/.zshrc — those are shared across projects and were not removed.
```
