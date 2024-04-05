import { WaveLinkController } from '@darrellvs/node-wave-link-sdk';

(async () => {
  // Create a new WaveLinkController instance and connect to the Wave Link server
  const waveLinkController = new WaveLinkController();
  await waveLinkController.connect();
  console.log('[INFO] WaveLink connected');

  // Get the input objects for the 'System', 'Music' and 'Voice Chat' inputs
  const input1 = waveLinkController.getInput({ name: 'System' });
  const input2 = waveLinkController.getInput({ name: 'Music' });

  if (!input1 || !input2) {
    throw new Error('One or more input(s) could not be found');
  }

  // Sync the muting of stream and local filters of input1 to input2
  input1.on('streamFiltersMuteChanged', (isMuted) => {
    input2.streamFiltersMute = isMuted;
  });

  input1.on('localFiltersMuteChanged', (isMuted) => {
    input2.localFiltersMute = isMuted;
  });

  // Get two filters from input 1
  const filter1 = input1.getFilter({ name: 'Elgato Noise Removal' });
  const filter2 = input1.getFilter({ name: 'Elgato Compressor' });

  if (!filter1 || !filter2) {
    throw new Error('Filters not found');
  }

  // Sync the muting of filter1 to filter2
  filter1.on('muteChanged', (isMuted) => {
    filter2.muted = isMuted;
  });

  // ✨ Tada! The muting of the filters of input1 will now be synced to input2
  // 🤔 Useful for muting multiple effects at once, even over multiple channels
})();
