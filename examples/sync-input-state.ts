import { WaveLinkController } from '@darrellvs/node-wave-link-sdk';

// This example demonstrates how to sync the volume and mute state of one input to another input

(async () => {
  // Create a new WaveLinkController instance and connect to the Wave Link server
  const waveLinkController = new WaveLinkController();
  await waveLinkController.connect();
  console.log('[INFO] WaveLink connected');

  // Get the input objects for the 'System' and 'Music' inputs
  const input1 = waveLinkController.getInput({ name: 'System' });
  const input2 = waveLinkController.getInput({ name: 'Music' });

  if (!input1 || !input2) {
    throw new Error('One or more input(s) could not be found');
  }

  // Sync the local volume and mute state of input1 to input2
  input1.on('localVolumeChanged', () => {
    input2.localVolume = input1.localVolume;
  });

  input1.on('localMuteChanged', (isMuted) => {
    input2.localMute = isMuted;
  });

  input1.on('streamVolumeChanged', () => {
    input2.streamVolume = input1.streamVolume;
  });

  input1.on('streamMuteChanged', (isMuted) => {
    input2.streamMute = isMuted;
  });

  // That's it! The volume and mute state of input1 will now be synced to input2
})();
