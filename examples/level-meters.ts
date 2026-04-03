/**
 * Example: Subscribe to level meters for all channels.
 * Run: npm run example:meters
 */
import { WaveLinkController } from '../src';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  console.log('Connected! Subscribing to level meters for all channels...');
  for (const channel of sdk.getChannels()) {
    sdk.subscribeLevelMeter('channel', channel.id);
  }
  for (const mix of sdk.getMixes()) {
    sdk.subscribeLevelMeter('mix', mix.id);
  }
});

sdk.on('levelMeterChanged', () => {
  const meters = sdk.getLevelMeters();
  const lines: string[] = [];

  for (const m of meters.channels) {
    const channel = sdk.getChannelById(m.id);
    const name = channel?.name ?? m.id;
    lines.push(`  ${name.padEnd(16)} L:${m.levelLeftPercentage.toFixed(1).padStart(5)}%  R:${m.levelRightPercentage.toFixed(1).padStart(5)}%`);
  }

  if (lines.length > 0) {
    process.stdout.write('\x1B[2J\x1B[0f'); // clear terminal
    console.log('=== Channel Levels ===');
    lines.forEach((l) => console.log(l));
  }
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
