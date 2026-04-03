import { BaseWaveLinkController } from './Base/BaseWaveLinkController';
import { TypedEventEmitter } from './Helpers/EventEmitterHelpers';
import {
  Channel,
  FocusedApp,
  InputDevice,
  LevelMeter,
  LevelMeters,
  MainOutput,
  Mix,
  OutputDevice,
  SetChannelPayload,
  SetInputDevicePayload,
  SetMixPayload,
  SetOutputDevicePayload,
  SetSubscriptionPayload,
  WaveLinkControllerEvents,
} from './Types/WaveLink';

export class WaveLinkController extends TypedEventEmitter<WaveLinkControllerEvents> {

  // Internal state
  private inputDevices: InputDevice[] = [];
  private outputDevices: OutputDevice[] = [];
  private mainOutput: MainOutput = { outputDeviceId: '' };
  private channels: Channel[] = [];
  private mixes: Mix[] = [];
  private focusedApp: FocusedApp = { id: '', name: '', channel: { id: '' } };
  private levelMeters: LevelMeters = {
    inputDevices: [],
    outputDevices: [],
    channels: [],
    mixes: [],
  };
  private _isConnected = false;

  private client: WaveLinkClient;

  constructor() {
    super();
    this.client = new WaveLinkClient(this);
  }

  // --- Lifecycle ---

  public connect() {
    this.client.connect();
  }

  public disconnect() {
    this.client.disconnect();
  }

  public isConnected(): boolean {
    return this._isConnected;
  }

  // --- State accessors ---

  public getInputDevices(): InputDevice[] {
    return this.inputDevices;
  }

  /** Returns only physical Wave microphone devices */
  public getWaveInputDevices(): InputDevice[] {
    return this.inputDevices.filter((d) => d.isWaveDevice);
  }

  public getInputDeviceById(id: string): InputDevice | undefined {
    return this.inputDevices.find((d) => d.id === id);
  }

  public getOutputDevices(): OutputDevice[] {
    return this.outputDevices;
  }

  /** Returns only physical Wave output devices */
  public getWaveOutputDevices(): OutputDevice[] {
    return this.outputDevices.filter((d) => d.isWaveDevice);
  }

  public getOutputDeviceById(id: string): OutputDevice | undefined {
    return this.outputDevices.find((d) => d.id === id);
  }

  public getMainOutput(): MainOutput {
    return this.mainOutput;
  }

  public getChannels(): Channel[] {
    return this.channels;
  }

  public getChannelById(id: string): Channel | undefined {
    return this.channels.find((c) => c.id === id);
  }

  public getMixes(): Mix[] {
    return this.mixes;
  }

  public getMixById(id: string): Mix | undefined {
    return this.mixes.find((m) => m.id === id);
  }

  public getLevelMeters(): LevelMeters {
    return this.levelMeters;
  }

  public getFocusedApp(): FocusedApp {
    return this.focusedApp;
  }

  // --- Mutation methods ---

  public setInputDevice(payload: SetInputDevicePayload): void {
    this.client.send('setInputDevice', payload).catch(() => {});
  }

  public setOutputDevice(payload: SetOutputDevicePayload): void {
    this.client.send('setOutputDevice', payload).catch(() => {});
  }

  public setChannel(payload: SetChannelPayload): void {
    this.client.send('setChannel', payload).catch(() => {});
  }

  public setMix(payload: SetMixPayload): void {
    this.client.send('setMix', payload).catch(() => {});
  }

  public addToChannel(appId: string, channelId: string): void {
    this.client.send('addToChannel', { appId, channelId }).catch(() => {});
  }

  // --- Subscriptions ---

  public subscribeLevelMeter(
    type: 'input' | 'output' | 'channel' | 'mix',
    id: string,
    subId?: string
  ): void {
    const payload: SetSubscriptionPayload = {
      levelMeterChanged: { isEnabled: true, type, id, ...(subId ? { subId } : {}) },
    };
    this.client.send('setSubscription', payload).catch(() => {});
  }

  public unsubscribeLevelMeter(
    type: 'input' | 'output' | 'channel' | 'mix',
    id: string,
    subId?: string
  ): void {
    const payload: SetSubscriptionPayload = {
      levelMeterChanged: { isEnabled: false, type, id, ...(subId ? { subId } : {}) },
    };
    this.client.send('setSubscription', payload).catch(() => {});
  }

  public subscribeFocusedApp(): void {
    this.client
      .send('setSubscription', {
        focusedAppChanged: { isEnabled: true },
      } as SetSubscriptionPayload)
      .catch(() => {});
  }

  public unsubscribeFocusedApp(): void {
    this.client
      .send('setSubscription', {
        focusedAppChanged: { isEnabled: false },
      } as SetSubscriptionPayload)
      .catch(() => {});
  }

  // --- Internal state update methods (called by WaveLinkClient) ---

  /** @internal */ _setConnected(val: boolean) { this._isConnected = val; }
  /** @internal */ _setInputDevices(v: InputDevice[]) { this.inputDevices = v; }
  /** @internal */ _setOutputDevices(v: OutputDevice[]) { this.outputDevices = v; }
  /** @internal */ _setMainOutput(v: MainOutput) { this.mainOutput = v; }
  /** @internal */ _setChannels(v: Channel[]) { this.channels = v; }
  /** @internal */ _setMixes(v: Mix[]) { this.mixes = v; }
  /** @internal */ _setFocusedApp(v: FocusedApp) { this.focusedApp = v; }
  /** @internal */ _getLevelMeters() { return this.levelMeters; }
}

// ---------------------------------------------------------------------------
// Internal client — handles protocol, not exposed publicly
// ---------------------------------------------------------------------------

class WaveLinkClient extends BaseWaveLinkController {
  constructor(private readonly controller: WaveLinkController) {
    super();
  }

  protected async onConnect() {
    // Step 1: verify this is Wave Link
    let appInfo: { appID: string; interfaceRevision: number };
    try {
      appInfo = await this.send<{ appID: string; interfaceRevision: number }>(
        'getApplicationInfo'
      );
    } catch {
      this.ignorePortAndReconnect();
      return;
    }

    if (appInfo.appID !== 'EWL' || appInfo.interfaceRevision < 1) {
      this.ignorePortAndReconnect();
      return;
    }

    // Step 2: load all state in parallel
    const [inputRes, outputRes, channelRes, mixRes] = await Promise.all([
      this.send<{ inputDevices: InputDevice[] }>('getInputDevices'),
      this.send<{ mainOutput: MainOutput; outputDevices: OutputDevice[] }>('getOutputDevices'),
      this.send<{ channels: Channel[] }>('getChannels'),
      this.send<{ mixes: Mix[] }>('getMixes'),
    ]);

    this.controller._setInputDevices(inputRes.inputDevices);
    this.controller._setOutputDevices(outputRes.outputDevices);
    this.controller._setMainOutput(outputRes.mainOutput);
    this.controller._setChannels(channelRes.channels);
    this.controller._setMixes(mixRes.mixes);
    this.controller._setConnected(true);

    // Step 3: register push notification handlers
    this.registerNotifications();

    // Step 4: emit ready
    this.controller.emit('ready');
  }

  protected onDisconnect() {
    const wasConnected = this.controller.isConnected();
    this.controller._setConnected(false);
    // Only emit 'disconnected' if we were previously in a ready state.
    // This prevents spam during initial port scanning / failed connection attempts.
    if (wasConnected) {
      this.controller.emit('disconnected');
    }
  }

  private registerNotifications() {
    this.onNotification('inputDevicesChanged', (params: any) => {
      this.controller._setInputDevices(params.inputDevices);
      this.controller.emit('inputDevicesChanged');
    });

    this.onNotification('inputDeviceChanged', (params: any) => {
      const devices = this.controller.getInputDevices();
      const target = devices.find((d) => d.id === params.id);
      if (target) {
        deepMergeDevice(target, params);
        this.controller.emit('inputDeviceChanged', params.id);
      }
    });

    this.onNotification('outputDevicesChanged', (params: any) => {
      const prevMain = JSON.stringify(this.controller.getMainOutput());
      if (params.mainOutput) {
        this.controller._setMainOutput(params.mainOutput);
        if (prevMain !== JSON.stringify(params.mainOutput)) {
          this.controller.emit('mainOutputDeviceChanged', params.mainOutput);
        }
      }
      if (params.outputDevices) {
        this.controller._setOutputDevices(params.outputDevices);
        this.controller.emit('outputDevicesChanged');
      }
    });

    this.onNotification('outputDeviceChanged', (params: any) => {
      const devices = this.controller.getOutputDevices();
      const target = devices.find((d) => d.id === params.id);
      if (target) {
        deepMergeDevice(target, params);
        this.controller.emit('outputDeviceChanged', params.id);
      }
    });

    this.onNotification('channelsChanged', (params: any) => {
      this.controller._setChannels(params.channels);
      this.controller.emit('channelsChanged');
    });

    this.onNotification('channelChanged', (params: any) => {
      const channels = this.controller.getChannels();
      const target = channels.find((c) => c.id === params.id);
      if (target) {
        const changedProps = Object.keys(params).filter(
          (k) => k !== 'id' && k !== 'type'
        );
        deepMergeChannel(target, params);
        this.controller.emit(
          'channelChanged',
          params.id,
          target.mixes.map((m) => m.id),
          changedProps
        );
      }
    });

    this.onNotification('mixesChanged', (params: any) => {
      this.controller._setMixes(params.mixes);
      this.controller.emit('mixesChanged');
    });

    this.onNotification('mixChanged', (params: any) => {
      const mixes = this.controller.getMixes();
      const target = mixes.find((m) => m.id === params.id);
      if (target) {
        Object.assign(target, params);
        this.controller.emit('mixChanged', params.id);
      }
    });

    this.onNotification('levelMeterChanged', (params: any) => {
      const lm = this.controller._getLevelMeters();
      upsertLevelMeters(lm.inputDevices, params.inputDevices ?? []);
      upsertLevelMeters(lm.outputDevices, params.outputDevices ?? []);
      upsertLevelMeters(lm.channels, params.channels ?? []);
      upsertLevelMeters(lm.mixes, params.mixes ?? []);
      this.controller.emit('levelMeterChanged');
    });

    this.onNotification('focusedAppChanged', (params: any) => {
      const app: FocusedApp = {
        id: params.id,
        name: params.name === '' ? '--' : params.name,
        channel: params.channel ?? { id: '' },
      };
      this.controller._setFocusedApp(app);
      this.controller.emit('focusedAppChanged', app);
    });
  }
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function deepMergeDevice(target: any, patch: any) {
  if (patch.inputs) {
    for (const inputPatch of patch.inputs) {
      const existing = target.inputs?.find((i: any) => i.id === inputPatch.id);
      if (existing) Object.assign(existing, inputPatch);
    }
  }
  if (patch.outputs) {
    for (const outputPatch of patch.outputs) {
      const existing = target.outputs?.find((o: any) => o.id === outputPatch.id);
      if (existing) Object.assign(existing, outputPatch);
    }
  }
  // copy top-level scalar fields
  for (const key of Object.keys(patch)) {
    if (key !== 'inputs' && key !== 'outputs' && key !== 'id') {
      target[key] = patch[key];
    }
  }
}

function deepMergeChannel(target: Channel, patch: any) {
  if (patch.mixes) {
    for (const mixPatch of patch.mixes) {
      const existing = target.mixes.find((m) => m.id === mixPatch.id);
      if (existing) Object.assign(existing, mixPatch);
    }
  }
  if (patch.effects) {
    for (const ep of patch.effects) {
      const existing = target.effects?.find((e) => e.id === ep.id);
      if (existing) Object.assign(existing, ep);
    }
  }
  for (const key of Object.keys(patch)) {
    if (!['mixes', 'effects', 'id', 'type'].includes(key)) {
      (target as any)[key] = patch[key];
    }
  }
}

function upsertLevelMeters(arr: LevelMeter[], incoming: LevelMeter[]) {
  for (const item of incoming) {
    const idx = arr.findIndex(
      (x) => x.id === item.id && x.subId === item.subId
    );
    if (idx >= 0) {
      arr[idx] = item;
    } else {
      arr.push(item);
    }
  }
}
