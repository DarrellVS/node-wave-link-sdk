import { BaseController } from './BaseController';
import { WaveLinkOutputChannelEvents } from '../Types/WaveLink';
import { BaseWaveLinkController } from './BaseWaveLinkController';
import simple_jsonrpc from 'simple-jsonrpc-js';
import { waveLinkOutputEvents } from '../Utils/constants';

export class WaveLinkOutputController extends BaseController<WaveLinkOutputChannelEvents> {
  #rpc: simple_jsonrpc;
  #waveLinkEmitter: BaseWaveLinkController;
  #identifier: string = '';
  #localVolume: number = 0;
  #localMute: boolean = false;
  #streamVolume: number = 0;
  #streamMute: boolean = false;

  constructor(
    rpc: simple_jsonrpc,
    waveLinkEmitter: BaseWaveLinkController,
    identifier: string,
    localMixer: [boolean, number, boolean],
    streamMixer: [boolean, number, boolean]
  ) {
    super();

    this.#rpc = rpc;
    this.#waveLinkEmitter = waveLinkEmitter;
    this.#identifier = identifier;

    this.#localMute = localMixer[0];
    this.#localVolume = localMixer[1];
    this.#streamMute = streamMixer[0];
    this.#streamVolume = streamMixer[1];

    this.#waveLinkEmitter.on(
      'outputVolumeChanged',
      async ({ selectedOutput, mixerID, value }) => {
        if (this.#identifier === selectedOutput) {
          if (mixerID === 'com.elgato.mix.local') {
            this.#localVolume = value;
            this.emit('localVolumeChanged', value);
            this.emit('volumeChanged', {
              localVolume: this.#localVolume,
              streamVolume: this.#streamVolume,
              localMute: this.#localMute,
              streamMute: this.#streamMute,
            });
          } else if (mixerID === 'com.elgato.mix.stream') {
            this.#streamVolume = value;
            this.emit('streamVolumeChanged', value);
            this.emit('volumeChanged', {
              localVolume: this.#localVolume,
              streamVolume: this.#streamVolume,
              localMute: this.#localMute,
              streamMute: this.#streamMute,
            });
          }
        }
      }
    );

    this.#waveLinkEmitter.on(
      'outputMuteChanged',
      ({ selectedOutput, mixerID, value }) => {
        if (this.#identifier === selectedOutput) {
          if (mixerID === 'com.elgato.mix.local') {
            this.#localMute = value;
            this.emit('localMuteChanged', value);
            this.emit('muteChanged', {
              localMute: this.#localMute,
              streamMute: this.#streamMute,
              streamVolume: this.#streamVolume,
              localVolume: this.#localVolume,
            });
          } else if (mixerID === 'com.elgato.mix.stream') {
            this.#streamMute = value;
            this.emit('streamMuteChanged', value);
            this.emit('muteChanged', {
              localMute: this.#localMute,
              streamMute: this.#streamMute,
              streamVolume: this.#streamVolume,
              localVolume: this.#localVolume,
            });
          }
        }
      }
    );

    this.#waveLinkEmitter.on('selectedOutputChanged', (selectedOutput) => {
      this.#identifier = selectedOutput;
      this.emit('selectedOutputChanged', selectedOutput);
    });

    waveLinkEmitter.on('websocketClose', () => {
      for (const eventName of waveLinkOutputEvents) {
        this.removeAllListeners(eventName);
      }
    });
  }

  public get identifier() {
    return this.#identifier;
  }

  public get localVolume(): number {
    return this.#localVolume;
  }

  public get streamVolume(): number {
    return this.#streamVolume;
  }

  public get localMute() {
    return this.#localMute;
  }

  public get streamMute() {
    return this.#streamMute;
  }

  public set localVolume(volume: number) {
    this.#rpc.call('setOutputConfig', {
      mixerID: 'com.elgato.mix.local',
      property: 'Output Level',
      value: volume,
    });
  }

  public set streamVolume(volume: number) {
    this.#rpc.call('setOutputConfig', {
      mixerID: 'com.elgato.mix.stream',
      property: 'Output Level',
      value: volume,
    });
  }

  public set localMute(isMuted: boolean) {
    this.#rpc.call('setOutputConfig', {
      mixerID: 'com.elgato.mix.local',
      property: 'Mute',
      value: isMuted,
    });
  }

  public set streamMute(isMuted: boolean) {
    this.#rpc.call('setOutputConfig', {
      mixerID: 'com.elgato.mix.stream',
      property: 'Mute',
      value: isMuted,
    });
  }

  public muteLocal() {
    this.localMute = true;
  }

  public unmuteLocal() {
    this.localMute = false;
  }

  public muteStream() {
    this.streamMute = true;
  }

  public unmuteStream() {
    this.streamMute = false;
  }
}
