---
description: "Disable notifications for the current project"
allowed-tools: ["Read", "Edit"]
---

# Disable Notifications

Toggle notifications off for the current project.

## Steps

1. Check if `.claude/notification-config.json` exists. If not, tell the user notifications are already not configured for this project.

2. If it exists, read it and set `"enabled": false`.

3. Use the Edit tool to change `"enabled": true` to `"enabled": false` in the config file.

4. Confirm to the user that notifications are now disabled. Tell them they can re-enable by running `/setup-notifications` or by editing `.claude/notification-config.json` and setting `"enabled": true`.
