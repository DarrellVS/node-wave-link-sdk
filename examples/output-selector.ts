/**
 * Example: List all output devices and programmatically switch the main output.
 *
 * On startup this prints every available output alongside its mix assignment
 * and current level, marking the active main output. It then switches to the
 * first non-main output it finds and restores the original after 5 seconds —
 * so you can hear the difference and verify the round-trip works.
 *
 * Run: npm run example:output
 */
import { WaveLinkController } from '../src';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  const outputDevices = sdk.getOutputDevices();
  const mainOutput = sdk.getMainOutput();
  const mixes = sdk.getMixes();

  // ── Print all outputs ──────────────────────────────────────────────────────
  console.log('=== Output Devices ===');
  for (const device of outputDevices) {
    console.log(`  ${device.name}${device.isWaveDevice ? ' [Wave]' : ''}`);
    for (const output of device.outputs) {
      const mix = mixes.find(m => m.id === output.mixId);
      const isMain =
        device.id === mainOutput.outputDeviceId && output.id === mainOutput.outputId;
      console.log(
        `    - ${(output.name ?? output.id).padEnd(22)}` +
        `  mix: ${(mix?.name ?? output.mixId).padEnd(16)}` +
        `  level: ${(output.level * 100).toFixed(0).padStart(3)}%` +
        (isMain ? '  ← MAIN' : '')
      );
    }
  }

  // ── Find an alternative output to switch to ────────────────────────────────
  const candidate = outputDevices
    .flatMap(d => d.outputs.map(o => ({ deviceId: d.id, outputId: o.id })))
    .find(c => c.deviceId !== mainOutput.outputDeviceId || c.outputId !== mainOutput.outputId);

  if (!candidate) {
    console.log('\nOnly one output available — nothing to switch to.');
    return;
  }

  const candidateDevice = sdk.getOutputDeviceById(candidate.deviceId);
  console.log(`\nSwitching main output → "${candidateDevice?.name ?? candidate.deviceId}"`);

  sdk.setOutputDevice({
    mainOutput: { outputDeviceId: candidate.deviceId, outputId: candidate.outputId },
  });

  // Restore the original selection after 5 seconds.
  setTimeout(() => {
    console.log('\nRestoring original main output...');
    sdk.setOutputDevice({ mainOutput });
  }, 5_000);
});

sdk.on('mainOutputDeviceChanged', (mainOutput) => {
  const device = sdk.getOutputDeviceById(mainOutput.outputDeviceId);
  console.log(`Main output → "${device?.name ?? mainOutput.outputDeviceId}"`);
});

sdk.on('disconnected', () => {
  console.log('Disconnected — will reconnect automatically.');
});

sdk.connect();
