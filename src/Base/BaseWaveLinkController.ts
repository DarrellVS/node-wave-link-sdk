import { BaseController } from './BaseController';
import simple_jsonrpc from 'simple-jsonrpc-js';
import { WebSocket } from 'ws';
import { getWaveLinkEventData } from '../Utils/constants';
import {
  GetInputConfigsResponse,
  GetOutputConfigResponse,
  GetOutputsResponse,
  WaveLinkEvents,
} from '../Types/WaveLink';

type ExtendedWebsocket = WebSocket & { rpc: simple_jsonrpc };

export class BaseWaveLinkController extends BaseController<WaveLinkEvents> {
  private websocket: ExtendedWebsocket;
  private minPort = 1824;
  private currentPort = this.minPort;
  private isConnecting: boolean = false;
  private lastId = 0;
  private emittedIdsMap = new Map<number, (data: unknown) => void>();
  private selectedOutput: string;

  constructor(
    private readonly rpc: simple_jsonrpc,
    private readonly host: string
  ) {
    super();
  }

  public connect(isAutoTry: boolean = false) {
    return new Promise((resolve, reject) => {
      if (!this.currentPort || this.isConnecting) {
        reject('Already connecting');
        return;
      }

      this.isConnecting = true;
      setTimeout(async () => {
        await this.tryToConnect(isAutoTry, () => resolve('Initialised'));
      }, 1000);
    });
  }

  public getWaveLinkEmmiter() {
    return this;
  }

  private async tryToConnect(isAutoTry: boolean = false, callback: () => void) {
    if (this.websocket) this.websocket.close();

    this.websocket = new WebSocket(
      `ws://${this.host}:${this.currentPort}`
    ) as ExtendedWebsocket;
    this.websocket.rpc = this.rpc;

    this.websocket.onopen = async () => {
      this.isConnecting = false;
      this.initRPC();
      this.emit('websocketOpen');

      const { selectedOutput } = await this.sendRPC<GetOutputsResponse>(
        'getOutputs',
        {
          mixerID: 'com.elgato.mix.local',
        }
      );

      this.selectedOutput = selectedOutput;

      const { localMixer, streamMixer } =
        await this.sendRPC<GetOutputConfigResponse>('getOutputConfig');

      const inputs = await this.sendRPC<GetInputConfigsResponse>(
        'getInputConfigs'
      );

      this.emit('initialiseChannels', {
        inputs,
        outputs: { localMixer, streamMixer },
        selectedOutput,
      });

      callback();
    };

    this.websocket.onclose = () => {
      this.isConnecting = false;
      this.emit('websocketClose');

      setTimeout(async () => {
        try {
          await this.connect(true);
        } catch (err) {}
      }, 5000);
    };

    this.websocket.onerror = (evt: any) => {
      setTimeout(async () => {
        try {
          await this.connect(true);
        } catch (err) {}
      }, 5000);
    };

    this.websocket.onmessage = async (evt: any) => {
      if (typeof evt.data === 'string') {
        const data = JSON.parse(evt.data);

        switch (data.method) {
          case 'inputsChanged':
            const newInputs = await this.sendRPC<GetInputConfigsResponse>(
              'getInputConfigs'
            );
            this.emit('inputsChanged', newInputs);
            break;

          case 'selectedOutputChanged':
            this.selectedOutput = data.params.value;
            this.emit('selectedOutputChanged', data.params.value);
            break;

          default:
            if (data.method === 'realTimeChanges') return;

            const eventData = getWaveLinkEventData(
              data.method,
              data.params,
              this.selectedOutput
            );
            if (eventData) {
              this.emit(data.method, eventData);
            }
            break;
        }

        if (data.id) {
          const callback = this.emittedIdsMap.get(data.id);
          if (callback) {
            callback(data.result);
          }
        }
      }
    };
  }

  private initRPC() {
    this.rpc.toStream = (msg: any) => {
      try {
        const { id } = JSON.parse(msg);
        this.lastId = id;
        this.websocket.send(msg);
      } catch (error) {
        console.log('ERROR:', error);
      }
    };
  }

  private async sendRPC<T>(method: string, params: any = {}): Promise<T> {
    return new Promise((resolve) => {
      this.sendRPCProxy(method, params, resolve);
    });
  }

  private sendRPCProxy(
    method: string,
    params: any,
    callback: (data: unknown) => void
  ) {
    const id = ++this.lastId;
    this.emittedIdsMap.set(id, callback);
    this.rpc.call(method, params, id);
  }
}
