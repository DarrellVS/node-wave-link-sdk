import { WaveLinkController } from '../src';

// This example demonstrates how to listen for changes in the local volume of the output mixer

(async () => {
  // Create a new WaveLinkController instance and connect to the Wave Link server
  const waveLinkController = new WaveLinkController();
  await waveLinkController.connect();
  console.log('[INFO] WaveLink connected');

  // Get the output mixer
  const output = waveLinkController.getOutput();

  if (!output) {
    throw new Error('Output not found');
  }

  // Log the local volume whenever it changes
  output.on('localVolumeChanged', (volume) => {
    console.log('Local volume changed', volume);
  });

  // 🚀 That's it, you may now further process the data and link it with other mixers
  // 🤔 Useful for syncing with external applications / SDK's
})();
