import { BaseController } from './Base/BaseController';
import { BaseWaveLinkController } from './Base/BaseWaveLinkController';
import simple_jsonrpc from 'simple-jsonrpc-js';
import { WaveLinkInputController } from './Base/WaveLinkInputController';
import { WaveLinkOutputController } from './Base/WaveLinkOutputController';
import {
  GetInputConfigsResponse,
  GetOutputConfigResponse,
  GetOutputsResponse,
} from './Types/WaveLink';

export class WaveLinkController extends BaseController<null> {
  private waveLinkController: BaseWaveLinkController | null = null;
  private INPUTS: WaveLinkInputController[] = [];
  private OUTPUT: WaveLinkOutputController;
  private rpc = new simple_jsonrpc();

  constructor(host: string = '127.0.0.1') {
    super();
    this.waveLinkController = new BaseWaveLinkController(this.rpc, host);

    this.waveLinkController.on(
      'initialiseChannels',
      ({ inputs, outputs, selectedOutput }) => {
        this.initialiseInputs(inputs);
        this.initialiseOutputs(outputs, selectedOutput);
      }
    );

    this.waveLinkController.on('inputsChanged', (inputs) => {
      this.initialiseInputs(inputs);
    });
  }

  private initialiseInputs(inputs: GetInputConfigsResponse) {
    this.INPUTS = [];
    inputs.forEach((input) => {
      this.INPUTS.push(
        new WaveLinkInputController(
          this.rpc,
          this.waveLinkController.getWaveLinkEmmiter(),
          input
        )
      );
    });
  }

  private initialiseOutputs(
    outputs: GetOutputConfigResponse,
    selectedOutput: GetOutputsResponse['selectedOutput']
  ) {
    this.OUTPUT = new WaveLinkOutputController(
      this.rpc,
      this.waveLinkController.getWaveLinkEmmiter(),
      selectedOutput,
      [...outputs.localMixer, false],
      [...outputs.streamMixer, false]
    );
  }

  async connect() {
    await this.waveLinkController.connect();
  }

  public getOutput() {
    return this.OUTPUT;
  }

  public getInputs() {
    return this.INPUTS;
  }

  public getInput({
    name,
    identifier,
  }: {
    name?: string;
    identifier?: string;
  }) {
    return this.INPUTS.find(
      (input) => input.identifier === identifier || input.name === name
    );
  }
}

export { WaveLinkInputController, WaveLinkOutputController };
