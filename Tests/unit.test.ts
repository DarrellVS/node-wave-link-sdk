/**
 * Unit tests — no network required.
 * Tests TypedEventEmitter behaviour and WaveLinkController state management
 * in full isolation.
 */

import { TypedEventEmitter } from '../src/Helpers/EventEmitterHelpers';
import { WaveLinkController } from '../src';
import type { Channel, Mix, InputDevice, OutputDevice, MainOutput } from '../src';

// ---------------------------------------------------------------------------
// TypedEventEmitter
// ---------------------------------------------------------------------------

describe('TypedEventEmitter', () => {
  type TestEvents = {
    ping: () => void;
    value: (n: number) => void;
    multi: (a: string, b: boolean) => void;
  };

  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it('calls a registered listener when the event is emitted', () => {
    const fn = jest.fn();
    emitter.on('ping', fn);
    emitter.emit('ping');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the listener', () => {
    const fn = jest.fn();
    emitter.on('value', fn);
    emitter.emit('value', 42);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('passes multiple arguments to the listener', () => {
    const fn = jest.fn();
    emitter.on('multi', fn);
    emitter.emit('multi', 'hello', true);
    expect(fn).toHaveBeenCalledWith('hello', true);
  });

  it('calls all listeners registered for the same event', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('ping', fn1);
    emitter.on('ping', fn2);
    emitter.emit('ping');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('does not cross-fire between different events', () => {
    const fn = jest.fn();
    emitter.on('value', fn);
    emitter.emit('ping');
    expect(fn).not.toHaveBeenCalled();
  });

  it('removes a specific listener with off()', () => {
    const fn = jest.fn();
    emitter.on('ping', fn);
    emitter.off('ping', fn);
    emitter.emit('ping');
    expect(fn).not.toHaveBeenCalled();
  });

  it('off() only removes the targeted listener, not others', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('ping', fn1);
    emitter.on('ping', fn2);
    emitter.off('ping', fn1);
    emitter.emit('ping');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('removeAllListeners() silences all listeners for that event', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('ping', fn1);
    emitter.on('ping', fn2);
    emitter.removeAllListeners('ping');
    emitter.emit('ping');
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('removeAllListeners() does not affect other events', () => {
    const fnPing = jest.fn();
    const fnValue = jest.fn();
    emitter.on('ping', fnPing);
    emitter.on('value', fnValue);
    emitter.removeAllListeners('ping');
    emitter.emit('value', 1);
    expect(fnValue).toHaveBeenCalledTimes(1);
  });

  it('emits the same event multiple times', () => {
    const fn = jest.fn();
    emitter.on('value', fn);
    emitter.emit('value', 1);
    emitter.emit('value', 2);
    emitter.emit('value', 3);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(3, 3);
  });
});

// ---------------------------------------------------------------------------
// WaveLinkController — initial / default state
// ---------------------------------------------------------------------------

describe('WaveLinkController initial state', () => {
  let ctrl: WaveLinkController;

  beforeEach(() => {
    ctrl = new WaveLinkController();
  });

  it('isConnected() is false before connecting', () => {
    expect(ctrl.isConnected()).toBe(false);
  });

  it('getInputDevices() returns an empty array', () => {
    expect(ctrl.getInputDevices()).toEqual([]);
  });

  it('getOutputDevices() returns an empty array', () => {
    expect(ctrl.getOutputDevices()).toEqual([]);
  });

  it('getChannels() returns an empty array', () => {
    expect(ctrl.getChannels()).toEqual([]);
  });

  it('getMixes() returns an empty array', () => {
    expect(ctrl.getMixes()).toEqual([]);
  });

  it('getMainOutput() returns empty sentinel before connecting', () => {
    expect(ctrl.getMainOutput()).toEqual({ outputDeviceId: '' });
  });

  it('getLevelMeters() returns correct empty structure', () => {
    expect(ctrl.getLevelMeters()).toEqual({
      inputDevices: [],
      outputDevices: [],
      channels: [],
      mixes: [],
    });
  });

  it('getChannelById() returns undefined when no channels are loaded', () => {
    expect(ctrl.getChannelById('anything')).toBeUndefined();
  });

  it('getMixById() returns undefined when no mixes are loaded', () => {
    expect(ctrl.getMixById('anything')).toBeUndefined();
  });

  it('getInputDeviceById() returns undefined when no devices are loaded', () => {
    expect(ctrl.getInputDeviceById('anything')).toBeUndefined();
  });

  it('getOutputDeviceById() returns undefined when no devices are loaded', () => {
    expect(ctrl.getOutputDeviceById('anything')).toBeUndefined();
  });

  it('getWaveInputDevices() returns an empty array', () => {
    expect(ctrl.getWaveInputDevices()).toEqual([]);
  });

  it('getWaveOutputDevices() returns an empty array', () => {
    expect(ctrl.getWaveOutputDevices()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// WaveLinkController — internal state setters + getters
// ---------------------------------------------------------------------------

describe('WaveLinkController state management', () => {
  let ctrl: WaveLinkController;

  // Access the @internal methods via any-cast
  const set = (ctrl: WaveLinkController) => ctrl as any;

  beforeEach(() => {
    ctrl = new WaveLinkController();
  });

  const mockChannels: Channel[] = [
    { id: 'ch1', name: 'Game', type: 'game', isMuted: false, level: 0.8, mixes: [], effects: [] },
    { id: 'ch2', name: 'Music', type: 'music', isMuted: true, level: 0.5, mixes: [], effects: [] },
  ];

  const mockMixes: Mix[] = [
    { id: 'mx1', name: 'Personal Mix', isMuted: false, level: 1.0 },
    { id: 'mx2', name: 'Stream Mix', isMuted: false, level: 0.7 },
  ];

  const mockInputDevices: InputDevice[] = [
    {
      id: 'id1', name: 'Wave Mic', isWaveDevice: true,
      inputs: [{ id: 'in1', isMuted: false, gain: { value: 0 }, micPcMix: { value: 0.5 }, dspEffects: [], effects: [] }],
    },
    {
      id: 'id2', name: 'Virtual', isWaveDevice: false,
      inputs: [],
    },
  ];

  const mockOutputDevices: OutputDevice[] = [
    { id: 'od1', name: 'Wave Out', isWaveDevice: true, outputs: [] },
    { id: 'od2', name: 'Speakers', isWaveDevice: false, outputs: [] },
  ];

  const mockMainOutput: MainOutput = { outputDeviceId: 'od1', outputId: 'out1' };

  it('_setChannels — getChannels returns set value', () => {
    set(ctrl)._setChannels(mockChannels);
    expect(ctrl.getChannels()).toBe(mockChannels);
  });

  it('getChannelById finds by id', () => {
    set(ctrl)._setChannels(mockChannels);
    expect(ctrl.getChannelById('ch1')).toBe(mockChannels[0]);
    expect(ctrl.getChannelById('ch2')).toBe(mockChannels[1]);
    expect(ctrl.getChannelById('nope')).toBeUndefined();
  });

  it('_setMixes — getMixes returns set value', () => {
    set(ctrl)._setMixes(mockMixes);
    expect(ctrl.getMixes()).toBe(mockMixes);
  });

  it('getMixById finds by id', () => {
    set(ctrl)._setMixes(mockMixes);
    expect(ctrl.getMixById('mx1')).toBe(mockMixes[0]);
    expect(ctrl.getMixById('mx2')).toBe(mockMixes[1]);
    expect(ctrl.getMixById('nope')).toBeUndefined();
  });

  it('_setInputDevices — getInputDevices returns set value', () => {
    set(ctrl)._setInputDevices(mockInputDevices);
    expect(ctrl.getInputDevices()).toBe(mockInputDevices);
  });

  it('getInputDeviceById finds by id', () => {
    set(ctrl)._setInputDevices(mockInputDevices);
    expect(ctrl.getInputDeviceById('id1')).toBe(mockInputDevices[0]);
    expect(ctrl.getInputDeviceById('nope')).toBeUndefined();
  });

  it('getWaveInputDevices filters to isWaveDevice === true', () => {
    set(ctrl)._setInputDevices(mockInputDevices);
    const wave = ctrl.getWaveInputDevices();
    expect(wave).toHaveLength(1);
    expect(wave[0].id).toBe('id1');
  });

  it('_setOutputDevices — getOutputDevices returns set value', () => {
    set(ctrl)._setOutputDevices(mockOutputDevices);
    expect(ctrl.getOutputDevices()).toBe(mockOutputDevices);
  });

  it('getOutputDeviceById finds by id', () => {
    set(ctrl)._setOutputDevices(mockOutputDevices);
    expect(ctrl.getOutputDeviceById('od2')).toBe(mockOutputDevices[1]);
    expect(ctrl.getOutputDeviceById('nope')).toBeUndefined();
  });

  it('getWaveOutputDevices filters to isWaveDevice === true', () => {
    set(ctrl)._setOutputDevices(mockOutputDevices);
    const wave = ctrl.getWaveOutputDevices();
    expect(wave).toHaveLength(1);
    expect(wave[0].id).toBe('od1');
  });

  it('_setMainOutput — getMainOutput returns set value', () => {
    set(ctrl)._setMainOutput(mockMainOutput);
    expect(ctrl.getMainOutput()).toBe(mockMainOutput);
  });

  it('_setConnected toggles isConnected()', () => {
    expect(ctrl.isConnected()).toBe(false);
    set(ctrl)._setConnected(true);
    expect(ctrl.isConnected()).toBe(true);
    set(ctrl)._setConnected(false);
    expect(ctrl.isConnected()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WaveLinkController — event wiring
// ---------------------------------------------------------------------------

describe('WaveLinkController events', () => {
  it('fires a ready listener', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('ready', done);
    (ctrl as any).emit('ready');
  });

  it('fires a disconnected listener', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('disconnected', done);
    (ctrl as any).emit('disconnected');
  });

  it('channelChanged delivers id, mixIds, and changedProperties', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('channelChanged', (id, mixIds, changedProps) => {
      expect(id).toBe('ch1');
      expect(mixIds).toEqual(['mx1', 'mx2']);
      expect(changedProps).toContain('level');
      done();
    });
    (ctrl as any).emit('channelChanged', 'ch1', ['mx1', 'mx2'], ['level']);
  });

  it('mixChanged delivers the mix id', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('mixChanged', (id) => {
      expect(id).toBe('mx1');
      done();
    });
    (ctrl as any).emit('mixChanged', 'mx1');
  });

  it('inputDeviceChanged delivers the device id', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('inputDeviceChanged', (id) => {
      expect(id).toBe('dev1');
      done();
    });
    (ctrl as any).emit('inputDeviceChanged', 'dev1');
  });

  it('focusedAppChanged delivers the app object', (done) => {
    const ctrl = new WaveLinkController();
    ctrl.on('focusedAppChanged', (app) => {
      expect(app.id).toBe('com.spotify');
      expect(app.name).toBe('Spotify');
      done();
    });
    (ctrl as any).emit('focusedAppChanged', { id: 'com.spotify', name: 'Spotify', channel: { id: 'ch1' } });
  });
});
