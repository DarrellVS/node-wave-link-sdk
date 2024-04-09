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
import { waveLinkInternalEventsToBeRemoved } from './Utils/constants';

export class WaveLinkController extends BaseController<{
  websocketOpen: () => void;
  websocketClose: () => void;
  ready: () => void;
}> {
  private waveLinkController: BaseWaveLinkController | null = null;
  private INPUTS: WaveLinkInputController[] = [];
  private OUTPUT: WaveLinkOutputController;
  private rpc = new simple_jsonrpc();

  constructor(host: string = '127.0.0.1') {
    super();
    this.waveLinkController = new BaseWaveLinkController(this.rpc, host);
    this.waveLinkController.setMaxListeners(16);

    this.waveLinkController.on(
      'initialiseChannels',
      ({ inputs, outputs, selectedOutput }) => {
        this.initialiseInputs(inputs);
        this.initialiseOutputs(outputs, selectedOutput);

        this.emit('ready');
      }
    );

    this.waveLinkController.on('websocketOpen', () => {
      this.attachCloseListener();
      this.emit('websocketOpen');
    });
  }

  private initialiseInputs(inputs: GetInputConfigsResponse) {
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

  private attachCloseListener() {
    this.waveLinkController.on('websocketClose', () => {
      setTimeout(() => {
        waveLinkInternalEventsToBeRemoved.forEach((eventName) => {
          this.waveLinkController.removeAllListeners(eventName);
        });

        this.INPUTS = [];
        this.OUTPUT = null;

        this.emit('websocketClose');
      }, 100);
    });
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
