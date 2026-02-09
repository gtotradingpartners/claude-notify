---
description: "Disable notifications for the current project"
allowed-tools: ["Read", "Edit", "AskUserQuestion", "Glob"]
---

# Disable Notifications

Toggle notifications off for a project.

## Step 0: Find the project

Look for `notification-config.json`:

1. Check the current working directory: `.claude/notification-config.json`
2. If not found, search subdirectories: `*/.claude/notification-config.json`
3. If multiple found, use AskUserQuestion to ask which project to disable
4. If none found, tell the user notifications are not configured for any project here and stop

## Step 1: Disable

Read the found config file. If already disabled (`"enabled": false`), tell the user it's already disabled and stop.

If enabled, use the Edit tool to change `"enabled": true` to `"enabled": false` in the config file. Use the full absolute path.

## Step 2: Confirm

Confirm to the user that notifications are now disabled for that project. Tell them they can re-enable by running `/setup-notifications` or by editing the config file and setting `"enabled": true`.
