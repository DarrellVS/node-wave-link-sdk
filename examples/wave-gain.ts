/**
 * Example: Print Wave microphone gain and adjust it via setInputDevice.
 * Run: npm run example:gain
 */
import { WaveLinkController } from '../src';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  const waveDevices = sdk.getWaveInputDevices();
  if (waveDevices.length === 0) {
    console.log('No physical Wave microphone detected.');
    return;
  }

  for (const device of waveDevices) {
    console.log(`Wave device: ${device.name} (${device.id})`);
    for (const input of device.inputs) {
      console.log(`  Input: ${input.name ?? input.id}`);
      console.log(`    gain:     ${input.gain.value} dB`);
      console.log(`    micPcMix: ${(input.micPcMix.value * 100).toFixed(0)}%`);
      console.log(`    muted:    ${input.isMuted}`);
    }
  }
});

sdk.on('inputDeviceChanged', (id) => {
  const device = sdk.getInputDeviceById(id);
  if (!device) return;
  for (const input of device.inputs) {
    console.log(`[${device.name}] input updated — gain: ${input.gain.value} dB, muted: ${input.isMuted}`);
  }
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
