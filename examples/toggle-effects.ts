/**
 * Example: Toggle all effects on a channel on and off at a fixed interval.
 *
 * On startup this lists every effect configured on TARGET_CHANNEL, then
 * flips them all in unison every TOGGLE_INTERVAL_MS milliseconds so you can
 * hear the before/after difference.
 *
 * Toggle semantics:
 *   - If every effect is enabled  → disable all.
 *   - If any effect is disabled   → enable all.
 *
 * Press Ctrl+C to stop and disconnect cleanly.
 *
 * Run: npm run example:effects
 */
import { WaveLinkController } from '../src';

/** Channel name whose effects should be toggled. Change to match your setup. */
const TARGET_CHANNEL = 'Microphone';
/** Milliseconds between each toggle */
const TOGGLE_INTERVAL_MS = 3_000;

const sdk = new WaveLinkController();
let toggleTimer: ReturnType<typeof setInterval> | undefined;

sdk.on('ready', () => {
  const channel = sdk.getChannels().find(c => c.name === TARGET_CHANNEL);

  if (!channel) {
    console.warn(`Channel "${TARGET_CHANNEL}" not found.`);
    console.log('Available channels:', sdk.getChannels().map(c => c.name).join(', '));
    return;
  }

  console.log(`Connected! Effects on "${channel.name}":`);

  if (channel.effects.length === 0) {
    console.log('  (no effects configured on this channel)');
    return;
  }

  for (const effect of channel.effects) {
    console.log(`  ${effect.id.padEnd(40)}  enabled: ${effect.isEnabled}`);
  }

  console.log(`\nToggling all effects every ${TOGGLE_INTERVAL_MS / 1_000}s — Ctrl+C to stop.\n`);

  toggleTimer = setInterval(() => {
    const current = sdk.getChannelById(channel.id);
    if (!current || current.effects.length === 0) return;

    // If every effect is already enabled, disable all; otherwise enable all.
    const allEnabled = current.effects.every(e => e.isEnabled);
    const next = !allEnabled;

    sdk.setChannel({
      id: current.id,
      effects: current.effects.map(e => ({ id: e.id, isEnabled: next })),
    });

    console.log(`Effects ${next ? 'ENABLED' : 'DISABLED'}`);
  }, TOGGLE_INTERVAL_MS);
});

sdk.on('channelChanged', (id, _mixIds, changedProperties) => {
  if (!changedProperties.includes('effects')) return;
  const channel = sdk.getChannelById(id);
  if (!channel) return;

  const summary = channel.effects.map(e => `${e.id}=${e.isEnabled}`).join(', ');
  console.log(`[${channel.name}] effects updated: ${summary || '(none)'}`);
});

process.on('SIGINT', () => {
  if (toggleTimer) clearInterval(toggleTimer);
  sdk.disconnect();
  process.exit(0);
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
