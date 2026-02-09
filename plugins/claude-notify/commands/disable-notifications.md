---
description: "Disable notifications for the current project"
allowed-tools: ["Read", "Edit", "AskUserQuestion", "Glob", "Bash"]
---

# Disable Notifications

Toggle notifications off for a project.

**Config location:** `~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

## Step 0: Find the project

Determine the project directory (use the current working directory).

Compute the config path: `~/.claude/claude-notify/configs/<ENCODED_PATH>/notification-config.json`
where `<ENCODED_PATH>` = absolute project path with `/` replaced by `-`.

Check if the config file exists at that path. If not found, also check the legacy location (`<PROJECT_DIR>/.claude/notification-config.json`).

If no config is found at either location, tell the user notifications are not configured for this project and stop.

## Step 1: Disable

Read the found config file. If already disabled (`"enabled": false`), tell the user it's already disabled and stop.

If enabled, use the Edit tool to change `"enabled": true` to `"enabled": false` in the config file. Use the full absolute path.

## Step 2: Confirm

Confirm to the user that notifications are now disabled for that project. Tell them they can re-enable by running `/setup-notifications` or by editing the config file and setting `"enabled": true`.
