import { WaveLinkController } from '../src';

test('inputs are defined', async () => {
  const controller = new WaveLinkController();
  await controller.connect();

  const inputs = controller.getInputs();
  expect(inputs).toBeInstanceOf(Array);
});
