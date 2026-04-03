/**
 * Example: Auto-duck the "Music" channel when another channel's volume is raised.
 *
 * When any non-music channel rises above DUCK_THRESHOLD, the music channel is
 * lowered to DUCKED_LEVEL. When all non-music channels drop back below the
 * threshold the music is restored to RESTORE_LEVEL.
 *
 * A simple isDucked flag prevents redundant setChannel calls when the threshold
 * is already crossed or already cleared.
 *
 * Run: npm run example:duck
 */
import { WaveLinkController } from '../src';

const MUSIC_CHANNEL_NAME = 'Music';

/** Raise any non-music channel above this level to trigger ducking (0–1) */
const DUCK_THRESHOLD = 0.7;
/** Level the music channel is set to while ducked (0–1) */
const DUCKED_LEVEL = 0.3;
/** Level the music channel is restored to after the trigger drops (0–1) */
const RESTORE_LEVEL = 0.8;

const sdk = new WaveLinkController();

// Track whether music is currently ducked so we avoid repeated setChannel calls.
let isDucked = false;

sdk.on('ready', () => {
  const channels = sdk.getChannels();
  const musicChannel = channels.find(c => c.name === MUSIC_CHANNEL_NAME);

  console.log('Connected!');
  console.log('Channels:', channels.map(c => `${c.name} (${(c.level * 100).toFixed(0)}%)`).join(', '));

  if (!musicChannel) {
    console.warn(`No channel named "${MUSIC_CHANNEL_NAME}" found — ducking will not activate.`);
  } else {
    console.log(
      `Monitoring for changes. Will duck "${MUSIC_CHANNEL_NAME}" when another channel` +
      ` exceeds ${(DUCK_THRESHOLD * 100).toFixed(0)}%.`
    );
  }
});

sdk.on('channelChanged', (id, _mixIds, changedProperties) => {
  if (!changedProperties.includes('level')) return;

  const changedChannel = sdk.getChannelById(id);
  if (!changedChannel || changedChannel.name === MUSIC_CHANNEL_NAME) return;

  const musicChannel = sdk.getChannels().find(c => c.name === MUSIC_CHANNEL_NAME);
  if (!musicChannel) return;

  const shouldDuck = changedChannel.level >= DUCK_THRESHOLD;

  if (shouldDuck && !isDucked) {
    isDucked = true;
    console.log(
      `[${changedChannel.name}] level ${(changedChannel.level * 100).toFixed(0)}%` +
      ` ≥ ${(DUCK_THRESHOLD * 100).toFixed(0)}%` +
      ` — ducking "${MUSIC_CHANNEL_NAME}" to ${(DUCKED_LEVEL * 100).toFixed(0)}%`
    );
    sdk.setChannel({ id: musicChannel.id, level: DUCKED_LEVEL });
  } else if (!shouldDuck && isDucked) {
    isDucked = false;
    console.log(
      `[${changedChannel.name}] level dropped to ${(changedChannel.level * 100).toFixed(0)}%` +
      ` — restoring "${MUSIC_CHANNEL_NAME}" to ${(RESTORE_LEVEL * 100).toFixed(0)}%`
    );
    sdk.setChannel({ id: musicChannel.id, level: RESTORE_LEVEL });
  }
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
