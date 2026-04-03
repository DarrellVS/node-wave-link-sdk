/**
 * Example: Listen for channel volume and mute changes.
 * Run: npm run example:channels
 */
import { WaveLinkController } from '../src';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  console.log('Connected!');
  console.log('Channels:', sdk.getChannels().map((c) => `${c.name} (${c.id})`));
  console.log('Mixes:', sdk.getMixes().map((m) => `${m.name} (${m.id})`));
});

sdk.on('channelChanged', (id, _mixIds, changedProperties) => {
  const channel = sdk.getChannelById(id);
  if (!channel) return;

  if (changedProperties.includes('level')) {
    console.log(`[${channel.name}] master level: ${(channel.level * 100).toFixed(0)}%`);
  }
  if (changedProperties.includes('isMuted')) {
    console.log(`[${channel.name}] muted: ${channel.isMuted}`);
  }
});

sdk.on('mixChanged', (id) => {
  const mix = sdk.getMixById(id);
  if (!mix) return;
  console.log(`[mix: ${mix.name}] level: ${(mix.level * 100).toFixed(0)}%, muted: ${mix.isMuted}`);
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
