import simple_jsonrpc from 'simple-jsonrpc-js';
import { WaveLinkFilterController } from './WaveLinkFilterController';
import { BaseWaveLinkController } from './BaseWaveLinkController';
import {
  GetInputConfig,
  GetInputConfigsResponse,
  WaveLinkInputChannelEvents,
} from '../Types/WaveLink';
import { BaseController } from './BaseController';
import { waveLinkFilterEvents, waveLinkInputEvents } from '../Utils/constants';

export class WaveLinkInputController extends BaseController<WaveLinkInputChannelEvents> {
  #rpc: simple_jsonrpc;
  #waveLinkEmitter: BaseWaveLinkController;
  #FILTERS: WaveLinkFilterController[] = [];

  #name = '';
  #bgColor = '';
  #iconData = '';
  #inputType = 0;
  #identifier = '';
  #isAvailable = false;

  #localVolume: number = 0;
  #localMute: boolean = false;
  #streamVolume: number = 0;
  #streamMute: boolean = false;
  #localFiltersMuted: boolean = false;
  #streamFiltersMuted: boolean = false;

  constructor(
    rpc: simple_jsonrpc,
    waveLinkEmitter: BaseWaveLinkController,
    input: GetInputConfig
  ) {
    super();

    input.filters?.forEach((filter) => {
      this.#FILTERS.push(
        new WaveLinkFilterController(
          rpc,
          waveLinkEmitter,
          filter,
          input.identifier
        )
      );
    });

    this.#rpc = rpc;
    this.#identifier = input.identifier;
    this.#bgColor = input.bgColor;
    this.#iconData = input.iconData;
    this.#inputType = input.inputType;
    this.#isAvailable = input.isAvailable;
    this.#name = input.name;
    this.#waveLinkEmitter = waveLinkEmitter;
    this.#localMute = input.localMixer[0];
    this.#localVolume = input.localMixer[1];
    this.#streamMute = input.streamMixer[0];
    this.#streamVolume = input.streamMixer[1];

    this.#waveLinkEmitter.on(
      'filterBypassStateChanged',
      ({ identifier, mixerID, value }) => {
        if (identifier === this.#identifier) {
          if (mixerID === 'com.elgato.mix.local') {
            this.#localFiltersMuted = value;
            this.emit('localFiltersMuteChanged', value);
          } else if (mixerID === 'com.elgato.mix.stream') {
            this.#streamFiltersMuted = value;
            this.emit('streamFiltersMuteChanged', value);
          }
        }
      }
    );

    this.#waveLinkEmitter.on(
      'inputVolumeChanged',
      ({ identifier, mixerID, value }) => {
        if (identifier === this.#identifier) {
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
      'inputMuteChanged',
      ({ identifier, mixerID, value }) => {
        if (identifier === this.#identifier) {
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

    this.#waveLinkEmitter.on(
      'inputsChanged',
      (inputs: GetInputConfigsResponse) => {
        const newInput = inputs.find(
          (input) => input.identifier === this.#identifier
        );

        if (!newInput) {
          return;
        }

        this.#name = newInput.name;
        this.#bgColor = newInput.bgColor;
        this.#iconData = newInput.iconData;
        this.#inputType = newInput.inputType;
        this.#isAvailable = newInput.isAvailable;
      }
    );

    this.#waveLinkEmitter.on(
      'inputNameChanged',
      ({ identifier, value }: { identifier: string; value: string }) => {
        if (identifier === this.#identifier) {
          this.#name = value;
          this.emit('nameChanged', value);
        }
      }
    );

    this.#waveLinkEmitter.on('websocketClose', () => {
      for (const eventName of waveLinkInputEvents) {
        this.removeAllListeners(eventName);
      }

      for (const filter of this.#FILTERS) {
        for (const filterEvent of waveLinkFilterEvents) {
          filter.removeAllListeners(filterEvent);
        }
      }
    });
  }

  public getFilter({ name, filterID }: { name?: string; filterID?: string }) {
    return this.#FILTERS.find(
      (filter) =>
        (name && filter.name === name) || (filterID && filter.id === filterID)
    );
  }

  public get identifier() {
    return this.#identifier;
  }

  public get filters() {
    return this.#FILTERS;
  }

  public get bgColor() {
    return this.#bgColor;
  }

  public get iconData() {
    return this.#iconData;
  }

  public get inputType() {
    return this.#inputType;
  }

  public get isAvailable() {
    return this.#isAvailable;
  }

  public get name() {
    return this.#name;
  }

  public get localFiltersMute() {
    return this.#localFiltersMuted;
  }

  public get streamFiltersMute() {
    return this.#streamFiltersMuted;
  }

  public get localVolume() {
    return this.#localVolume;
  }

  public get streamVolume() {
    return this.#streamVolume;
  }

  public get localMute() {
    return this.#localMute;
  }

  public get streamMute() {
    return this.#streamMute;
  }

  public set localVolume(volume: number) {
    this.#rpc.call('setInputConfig', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.local',
      property: 'Volume',
      value: volume,
    });
  }

  public set streamVolume(volume: number) {
    this.#rpc.call('setInputConfig', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.stream',
      property: 'Volume',
      value: volume,
    });
  }

  public set localMute(isMuted: boolean) {
    this.#rpc.call('setInputConfig', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.local',
      property: 'Mute',
      value: isMuted,
    });
  }

  public set streamMute(isMuted: boolean) {
    this.#rpc.call('setInputConfig', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.stream',
      property: 'Mute',
      value: isMuted,
    });
  }

  public set localFiltersMute(isMuted: boolean) {
    this.#rpc.call('setFilterBypass', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.local',
      value: isMuted,
    });
  }

  public set streamFiltersMute(isMuted: boolean) {
    this.#rpc.call('setFilterBypass', {
      identifier: this.#identifier,
      mixerID: 'com.elgato.mix.stream',
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
