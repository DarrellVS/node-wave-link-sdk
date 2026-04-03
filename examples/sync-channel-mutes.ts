/**
 * Example: Mirror the mute state of one channel onto others in a linked group.
 *
 * Muting any channel in LINKED_CHANNELS immediately mutes all the others in
 * the group. Un-muting one un-mutes the rest. Channels whose mute state
 * already matches the source are left alone to avoid redundant round-trips.
 *
 * Useful when you always want "Game" and "Music" to mute together — e.g.
 * so pushing a hardware mute button silences both streams at once.
 *
 * Run: npm run example:sync-mutes
 */
import { WaveLinkController } from '../src';

/** Channel names to keep in sync. Adjust to match your Wave Link setup. */
const LINKED_CHANNELS = ['Game', 'Music'];

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  const channels = sdk.getChannels();
  const found = channels.filter(c => LINKED_CHANNELS.includes(c.name));
  const missing = LINKED_CHANNELS.filter(n => !found.some(c => c.name === n));

  console.log('Connected!');
  console.log('Linked channels:', found.map(c => `${c.name} (muted: ${c.isMuted})`).join(', '));

  if (missing.length > 0) {
    console.warn(`Channels not found: ${missing.join(', ')} — sync will not apply to them.`);
  }
});

sdk.on('channelChanged', (id, _mixIds, changedProperties) => {
  if (!changedProperties.includes('isMuted')) return;

  const source = sdk.getChannelById(id);
  if (!source || !LINKED_CHANNELS.includes(source.name)) return;

  // Find peers in the linked group that have a different mute state.
  const peers = sdk.getChannels().filter(
    c => LINKED_CHANNELS.includes(c.name) && c.id !== id && c.isMuted !== source.isMuted
  );

  for (const peer of peers) {
    console.log(`[${source.name}] muted=${source.isMuted} → syncing "${peer.name}"`);
    sdk.setChannel({ id: peer.id, isMuted: source.isMuted });
  }
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
