import { WaveLinkController } from '@darrellvs/node-wave-link-sdk';

// This example shows a more advanced example of processing the volume and mute state of multiple inputs to another input

(async () => {
  // Create a new WaveLinkController instance and connect to the Wave Link server
  const waveLinkController = new WaveLinkController();
  await waveLinkController.connect();
  console.log('[INFO] WaveLink connected');

  // Get the input objects for the 'System', 'Music' and 'Voice Chat' inputs
  const input1 = waveLinkController.getInput({ name: 'System' });
  const input2 = waveLinkController.getInput({ name: 'Music' });
  const input3 = waveLinkController.getInput({ name: 'Voice Chat' });

  if (!input1 || !input2 || !input3) {
    throw new Error('One or more input(s) could not be found');
  }

  // A function to set the volume of input2 to the minimum of input1 and input3
  const setMinimumVolume = () => {
    input2.localVolume = Math.min(input1.localVolume, input3.localVolume);
  };

  // Call the setMinimumVolume function whenever the local volume of input1 or input3 changes
  input1.on('localVolumeChanged', setMinimumVolume);
  input3.on('localVolumeChanged', setMinimumVolume);

  // 🚀 Voila! The volume of input2 will now always be the minimum of input1 and input3
  // 🤔 Useful for automatically ducking music when lowering the volume of a voice chat application
})();
