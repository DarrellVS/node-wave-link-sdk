/**
 * Example: Track the focused app and optionally route it to a channel.
 * Run: npm run example:focused
 */
import { WaveLinkController } from '../src';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  console.log('Connected! Subscribing to focused app changes...');
  sdk.subscribeFocusedApp();
});

sdk.on('focusedAppChanged', (app) => {
  console.log(`Focused app: "${app.name}" (${app.id})`);

  // Optionally route it to the "Game" channel if one exists
  const gameChannel = sdk.getChannels().find((c) => c.name === 'Game');
  if (gameChannel && app.id) {
    sdk.addToChannel(app.id, gameChannel.id);
    console.log(`  → Routed to channel: ${gameChannel.name}`);
  }
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
