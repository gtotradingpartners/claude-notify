#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Top-level crash handler — must be first thing after requires
const CRASH_LOG = path.join(process.env.HOME || '/tmp', '.claude', 'claude-notify-crash.log');
process.on('uncaughtException', (err) => {
  const msg = `[${new Date().toISOString()}] CRASH: ${err.stack || err.message}\n`;
  try { fs.appendFileSync(CRASH_LOG, msg); } catch (_) {}
  process.stderr.write(`claude-notify crash: ${err.message}\n`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  const msg = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${err?.stack || err}\n`;
  try { fs.appendFileSync(CRASH_LOG, msg); } catch (_) {}
  process.stderr.write(`claude-notify unhandled rejection: ${err?.message || err}\n`);
  process.exit(1);
});
const { loadConfig } = require('./lib/config');
const { parseTranscript } = require('./lib/transcript');
const { formatMessage } = require('./lib/formatter');
const { playSound, getSoundForEvent } = require('./lib/sound');
const { getTopicId, sendTelegram, pollTelegramReply } = require('./lib/telegram');
const { ensureChannel, sendSlack, pollSlackReply } = require('./lib/slack');

const LOG_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'claude-notify.log');

function log(msg) {
  const ts = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `[${ts}] ${msg}\n`);
  } catch (_) {
    // ignore log failures
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });

    // If stdin never closes within 5s, resolve with empty string
    const timer = setTimeout(() => resolve(''), 5000);
  });
}

async function runTest() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const config = loadConfig(projectDir);

  console.log('=== claude-notify test mode ===\n');
  console.log(`Project dir: ${projectDir}`);
  console.log(`Config path: ${config._configPath}`);
  console.log(`Enabled: ${config.enabled}`);
  console.log(`Channel: ${config.channel}`);
  console.log(`Project label: ${config.project_label}`);
  console.log(`Wait for reply: ${config.wait_for_reply}`);
  console.log(`Include history: ${config.include_history}`);
  console.log(`Reply timeout: ${config.reply_timeout}s`);

  if (!config.enabled) {
    console.log('\nNotifications are DISABLED for this project.');
    console.log('Create .claude/notification-config.json with "enabled": true to activate.');
    process.exit(0);
  }

  if (config.channel === 'telegram') {
    console.log(`\nTelegram bot token: ${config.telegram.bot_token ? 'SET' : 'MISSING'}`);
    console.log(`Telegram group ID: ${config.telegram.group_id || 'MISSING'}`);
    console.log(`Telegram topic ID: ${config.telegram.topic_id || 'not set (using General topic)'}`);

    if (!config.telegram.bot_token || !config.telegram.group_id) {
      console.error('\nError: Set CLAUDE_NOTIFY_TG_TOKEN and CLAUDE_NOTIFY_TG_GROUP_ID env vars');
      process.exit(1);
    }

    console.log('\nSending test notification to Telegram...');
    const topicId = getTopicId(config);
    console.log(`Topic ID: ${topicId || 'none (General topic)'}`);

    const testInput = {
      hook_event_name: 'Notification',
      notification_type: 'idle_prompt',
      message: 'This is a test notification from claude-notify.',
      session_id: 'test-session-' + Date.now(),
    };

    const message = formatMessage(testInput, config, '', config.wait_for_reply);
    await sendTelegram(config, message, topicId);
    console.log('Test notification sent successfully!');

    if (config.wait_for_reply) {
      console.log(`\nWaiting for reply (${config.reply_timeout}s timeout)...`);
      const reply = await pollTelegramReply(config, topicId, config.reply_timeout);
      if (reply) {
        console.log(`Reply received: "${reply}"`);
      } else {
        console.log('No reply received (timeout).');
      }
    }
  } else if (config.channel === 'slack') {
    console.log(`\nSlack bot token: ${config.slack.bot_token ? 'SET' : 'MISSING'}`);
    console.log(`Slack channel: ${config.slack.channel || 'not set'}`);
    console.log(`Slack auto-create: ${config.slack.auto_create_channel}`);

    if (!config.slack.bot_token) {
      console.error('\nError: Set CLAUDE_NOTIFY_SLACK_TOKEN env var');
      process.exit(1);
    }

    if (!config.slack.channel && !config.slack.auto_create_channel) {
      console.error('\nError: Set Slack channel env var or enable auto_create_channel in config');
      process.exit(1);
    }

    // Auto-create channel if needed
    const channelId = await ensureChannel(config);
    console.log(`Slack channel ID: ${channelId}`);

    console.log('\nSending test notification to Slack...');
    const testInput = {
      hook_event_name: 'Notification',
      notification_type: 'idle_prompt',
      message: 'This is a test notification from claude-notify.',
      session_id: 'test-session-' + Date.now(),
    };

    const message = formatMessage(testInput, config, '', config.wait_for_reply);
    const msgRef = await sendSlack(config, message);
    console.log('Test notification sent successfully!');

    if (config.wait_for_reply) {
      console.log(`\nWaiting for reply (${config.reply_timeout}s timeout)...`);
      const reply = await pollSlackReply(config, msgRef, config.reply_timeout);
      if (reply) {
        console.log(`Reply received: "${reply}"`);
      } else {
        console.log('No reply received (timeout).');
      }
    }
  }

  // Play sound
  const soundName = getSoundForEvent(config, 'Notification');
  playSound(soundName);
  console.log(`\nPlayed sound: ${soundName}`);
  console.log('\n=== test complete ===');
}

async function sendNotification(config, message) {
  if (config.channel === 'telegram') {
    const topicId = getTopicId(config);
    await sendTelegram(config, message, topicId);
    return (timeout, shouldAbort) => pollTelegramReply(config, topicId, timeout, shouldAbort);
  }

  if (config.channel === 'slack') {
    await ensureChannel(config);
    const msgRef = await sendSlack(config, message);
    return (timeout, shouldAbort) => pollSlackReply(config, msgRef, timeout, shouldAbort);
  }

  return null;
}

async function main() {
  // Handle --test flag
  if (process.argv.includes('--test')) {
    return runTest();
  }

  log('--- hook invoked ---');

  // Read hook JSON from stdin
  const raw = await readStdin();
  if (!raw.trim()) {
    log('EXIT: empty stdin');
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    log(`EXIT: JSON parse error: ${e.message}`);
    process.stderr.write(`claude-notify: failed to parse stdin JSON: ${e.message}\n`);
    process.exit(1);
  }

  const eventName = input.hook_event_name;
  const notifType = input.notification_type || '';
  log(`event=${eventName} type=${notifType} session=${input.session_id || 'unknown'}`);

  // Determine project directory — only use values Claude Code provides.
  // Do NOT fall back to process.cwd() which may be a macOS-protected directory
  // (Desktop, Documents, Google Drive) and trigger TCC privacy prompts.
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!projectDir) {
    log('EXIT: no project directory (CLAUDE_PROJECT_DIR not set, no cwd in input)');
    process.exit(0);
  }
  log(`project=${projectDir}`);

  // Load project config
  const config = loadConfig(projectDir);

  // Early exit if disabled or no config
  if (!config.enabled) {
    log(`EXIT: disabled for ${config.project_label || projectDir}`);
    process.exit(0);
  }

  // Check if this event type is enabled
  if (!config.events[eventName]) {
    log(`EXIT: event ${eventName} not enabled`);
    process.exit(0);
  }

  // For Notification events, check notification_type filter
  if (eventName === 'Notification' && config.notification_types) {
    if (notifType && config.notification_types[notifType] === false) {
      log(`EXIT: notification_type ${notifType} filtered out`);
      process.exit(0);
    }
  }

  // Infinite loop guard for Stop events
  const stopHookActive = input.stop_hook_active === true;

  // Delay before sending (gives you time to respond at the terminal first)
  const delay = config.send_delay || 0;
  if (delay > 0) {
    log(`delaying ${delay}s before send`);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
    log('delay complete, sending now');
  }

  // Parse transcript history if enabled
  let historyContext = '';
  if (config.include_history && input.transcript_path) {
    historyContext = parseTranscript(input.transcript_path, config.history_lines);
  }

  // Determine if we'll actually poll for a reply
  // Only poll for Stop/SubagentStop events (reply blocks the stop, Claude continues)
  // and idle_prompt (Claude is waiting for free-form input)
  // Permission prompts and elicitation dialogs require terminal UI interaction —
  // Telegram replies are ignored by Claude Code for those event types
  const replyableEvent = eventName === 'Stop' || eventName === 'SubagentStop'
    || (eventName === 'Notification' && notifType === 'idle_prompt');
  const willPollReply = config.wait_for_reply && replyableEvent && !stopHookActive;

  // Format message
  const message = formatMessage(input, config, historyContext, willPollReply);

  // Play local macOS sound
  const soundName = getSoundForEvent(config, eventName);
  playSound(soundName);

  // Send to configured channel and get a poll function for replies
  log(`sending to ${config.channel} (topic=${config.telegram?.topic_id || 'n/a'})`);
  const pollReply = await sendNotification(config, message);
  log('sent successfully');

  // Handle blocking reply (Notification events only)
  if (pollReply && willPollReply) {
    // Monitor transcript file — if it changes, user responded in the terminal
    const transcriptPath = input.transcript_path || '';
    let transcriptMtime = 0;
    if (transcriptPath) {
      try {
        transcriptMtime = fs.statSync(transcriptPath).mtimeMs;
      } catch (_) {}
    }
    const shouldAbort = () => {
      if (!transcriptPath || !transcriptMtime) return false;
      try {
        const currentMtime = fs.statSync(transcriptPath).mtimeMs;
        if (currentMtime > transcriptMtime) {
          log('transcript changed — user responded in terminal, aborting poll');
          return true;
        }
      } catch (_) {}
      return false;
    };

    log(`polling for reply (timeout=${config.reply_timeout}s, watching transcript for terminal input)`);
    const reply = await pollReply(config.reply_timeout, shouldAbort);
    if (reply) {
      log(`reply received: ${reply.substring(0, 100)}`);
      outputReply(eventName, config.channel, reply);
    } else {
      log('no reply (timeout or user responded in terminal)');
    }
  }

  log('--- hook complete ---');
  process.exit(0);
}

function outputReply(eventName, channel, replyText) {
  const replyMessage = `Human replied via ${channel}: ${replyText}`;
  let output;

  if (eventName === 'Stop' || eventName === 'SubagentStop') {
    // Block Claude from stopping, provide human's reply as reason to continue
    output = {
      decision: 'block',
      reason: replyMessage,
    };
  } else {
    // Return reply as additional context (Notification and all other events)
    output = {
      hookSpecificOutput: {
        hookEventName: eventName,
        additionalContext: replyMessage,
      },
    };
  }

  process.stdout.write(JSON.stringify(output));
}

main().catch(err => {
  process.stderr.write(`claude-notify error: ${err.message}\n`);
  process.exit(1);
});
