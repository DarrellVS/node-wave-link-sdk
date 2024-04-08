import { BaseController } from './BaseController';
import simple_jsonrpc from 'simple-jsonrpc-js';
import { BaseWaveLinkController } from './BaseWaveLinkController';
import { GetInputConfigFilter, WaveLinkFilterEvents } from '../Types/WaveLink';

export class WaveLinkFilterController extends BaseController<WaveLinkFilterEvents> {
  #id: string = '';
  #name: string = '';
  #muted: boolean = true;
  #pluginID: string = '';
  #channelIdentifier: string = '';

  constructor(
    private readonly rpc: simple_jsonrpc,
    waveLinkEmitter: BaseWaveLinkController,
    filter: GetInputConfigFilter,
    channelIdentifier: string
  ) {
    super();

    this.#id = filter.filterID;
    this.#name = filter.name;
    this.#muted = !filter.isActive;
    this.#pluginID = filter.pluginID;
    this.#channelIdentifier = channelIdentifier;

    waveLinkEmitter.on('filterChanged', ({ identifier, filterID, value }) => {
      if (identifier === this.#channelIdentifier && filterID === this.#id) {
        this.#muted = !value;
        this.emit('muteChanged', this.#muted);
        this.emit(value ? 'unmute' : 'mute');
      }
    });
  }

  public get id() {
    return this.#id;
  }

  public get name() {
    return this.#name;
  }

  public get muted() {
    return this.#muted;
  }

  public get pluginID() {
    return this.#pluginID;
  }

  public set muted(shouldMute: boolean) {
    shouldMute ? this.mute() : this.unmute();
  }

  public mute() {
    this.rpc.call('setFilter', {
      filterID: this.id,
      identifier: this.#channelIdentifier,
      value: false,
    });
  }

  public unmute() {
    this.rpc.call('setFilter', {
      filterID: this.id,
      identifier: this.#channelIdentifier,
      value: true,
    });
  }
}
