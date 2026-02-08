---
description: "Find your Telegram group ID automatically using your bot"
allowed-tools: ["AskUserQuestion", "Bash", "Read", "Edit"]
---

# Find Telegram Group ID

This command helps you find the numeric group ID that Telegram uses internally. You need this ID for claude-notify to send messages to your group.

**Prerequisites:** You must already have a Telegram bot and a group. If you don't, this command will walk you through creating them first.

## Step 1: Check for Bot Token

Check if `CLAUDE_NOTIFY_TG_TOKEN` env var is set: run `source ~/.zshrc 2>/dev/null; test -n "$CLAUDE_NOTIFY_TG_TOKEN" && echo "SET" || echo "MISSING"`

### If the token is MISSING:

Use AskUserQuestion to ask:

**Question: "Do you already have a Telegram bot?"**
- header: "Bot"
- options:
  - **Yes, I have a bot token** — "I already created a bot via @BotFather and have the token"
  - **No, I need to create one** — "Show me how to create a Telegram bot from scratch"

#### If "No, I need to create one":

Tell the user:
```
How to create a Telegram bot:

1. Open Telegram on your phone or desktop
2. Search for @BotFather and start a chat with it
3. Send: /newbot
4. BotFather will ask for a display name — type anything (e.g. "Claude Alerts")
5. BotFather will ask for a username — must end in "bot" (e.g. "my_claude_alerts_bot")
6. BotFather will reply with your bot token — it looks like:
   123456789:ABCDefGhIJKlmNoPQRsTUVwxyz
7. Copy that entire token string
```

#### For both cases (has token or just created one):

Use AskUserQuestion to ask the user to paste their bot token:

**Question: "Paste your bot token below (format: 123456789:ABCDefGh...):"**
- header: "Token"
- options:
  - **I've set it in ~/.zshrc already** — "I already ran: export CLAUDE_NOTIFY_TG_TOKEN=..."
  - **Let me paste it now** — "I'll type/paste my token"

If "Let me paste it now": ask them to enter the token via AskUserQuestion freeform input. Then save it:

Run: `echo 'export CLAUDE_NOTIFY_TG_TOKEN="<THEIR_TOKEN>"' >> ~/.zshrc`

Then run: `source ~/.zshrc` to load it.

If "I've set it in ~/.zshrc already": run `source ~/.zshrc` and verify with `test -n "$CLAUDE_NOTIFY_TG_TOKEN"`. If still missing, tell them to check their ~/.zshrc for the export line.

### If the token is SET:

Tell the user their bot token is configured and move to Step 2.

## Step 2: Check for Group

Use AskUserQuestion to ask:

**Question: "Do you have a Telegram group for notifications?"**
- header: "Group"
- options:
  - **Yes, I have a group** — "I already have a group with my bot added to it"
  - **No, I need to create one** — "Show me how to create a group and set it up"

### If "No, I need to create one":

Tell the user:
```
How to create a Telegram group for notifications:

1. Open Telegram
2. Tap the compose/new message button → "New Group"
3. Add your bot (search for its @username) as a member
4. Give the group a name (e.g. "Claude Notifications")
5. After creating the group, go to the group settings:
   - Tap the group name at the top
   - Tap "Edit" (pencil icon)
   - Scroll down and toggle ON "Topics"
   (This enables forum mode — each project gets its own topic thread)
6. Make your bot an admin:
   - In group settings, tap "Administrators"
   - Tap "Add Admin"
   - Select your bot
   - Confirm

Your group is ready! Continue below to find the group ID.
```

### If "Yes, I have a group":

Remind them:
```
Make sure:
- Your bot is a member of the group
- Your bot is an admin (needed to create topic threads)
- "Topics" is enabled in group settings (Group → Edit → Topics)
```

## Step 3: Find the Group ID

Tell the user:
```
Now send any message in your Telegram group (just type "hello" or anything).
This lets your bot see the group in its updates.
```

Use AskUserQuestion to ask:

**Question: "Have you sent a message in the group?"**
- header: "Message"
- options:
  - **Yes, I sent a message** — "I just sent a message in the group"
  - **Let me do that now** — "Give me a moment to send a message"

If "Let me do that now": wait for them, then ask again.

Once they've sent a message, query the bot API:

Run: `source ~/.zshrc 2>/dev/null; curl -s "https://api.telegram.org/bot${CLAUDE_NOTIFY_TG_TOKEN}/getUpdates?offset=-10" 2>/dev/null`

Parse the JSON response. Look for entries where `message.chat.type` is `"group"` or `"supergroup"`. For each unique group found, extract:
- `message.chat.id` — the numeric group ID (negative number)
- `message.chat.title` — the group name

**If groups are found:**

Show the user a list like:
```
Found these groups your bot is in:

  Group: "Claude Notifications"
  ID: -1001234567890

  Group: "Other Group"
  ID: -1009876543210
```

If there's only one group, confirm it's the right one. If multiple, use AskUserQuestion to let them pick.

Then save the group ID:

Run: `echo 'export CLAUDE_NOTIFY_TG_GROUP_ID="<GROUP_ID>"' >> ~/.zshrc`
Run: `source ~/.zshrc`

Tell the user:
```
Group ID saved! Your environment is now configured:
  CLAUDE_NOTIFY_TG_TOKEN ✓
  CLAUDE_NOTIFY_TG_GROUP_ID ✓

You can now run /claude-notify:setup-notifications to configure notifications for a project.
```

**If NO groups are found:**

Tell the user:
```
No groups found. This usually means one of:
1. Your bot hasn't received any messages yet — send a message in the group and try again
2. Your bot isn't in the group — add it as a member
3. Too much time passed since the message — Telegram only keeps recent updates. Send a new message and try again immediately.
```

Use AskUserQuestion to ask if they want to retry.

**If the API call fails or returns an error:**

Show the error and suggest:
```
The API call failed. Common reasons:
- Invalid bot token — double-check CLAUDE_NOTIFY_TG_TOKEN in ~/.zshrc
- Network issue — check your internet connection
```
