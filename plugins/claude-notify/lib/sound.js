const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SOUNDS_DIR = '/System/Library/Sounds';

function playSound(soundName) {
  if (!soundName || soundName === 'silent') return;

  const fileName = soundName === 'default' ? 'Glass' : soundName;
  const soundFile = path.join(SOUNDS_DIR, `${fileName}.aiff`);

  if (!fs.existsSync(soundFile)) {
    process.stderr.write(`claude-notify: sound file not found: ${soundFile}\n`);
    return;
  }

  // Fire-and-forget
  const child = spawn('afplay', [soundFile], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function getSoundForEvent(config, eventName) {
  // Per-event sound overrides the global sound
  if (config.sounds && config.sounds[eventName]) {
    return config.sounds[eventName];
  }
  return config.sound || 'default';
}

module.exports = { playSound, getSoundForEvent };
