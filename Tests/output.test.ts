import { WaveLinkOutputController } from '../src/Base/WaveLinkOutputController';
import { WaveLinkController } from '../src';

test('output is defined', async () => {
  const controller = new WaveLinkController();
  await controller.connect();

  const output = controller.getOutput();
  expect(output).toBeInstanceOf(WaveLinkOutputController);
});
