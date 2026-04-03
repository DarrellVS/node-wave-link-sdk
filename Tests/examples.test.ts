/**
 * Feature tests for the examples/ directory patterns.
 *
 * Each suite proves the behaviour shown in a corresponding example script
 * without requiring a live Wave Link connection.
 *
 * Strategy:
 *   - Pre-load state via the @internal _set* methods.
 *   - Emit events directly via (ctrl as any).emit(event, ...args).
 *   - Spy on mutation methods (setChannel, addToChannel, etc.) to assert calls.
 */

import { WaveLinkController } from '../src';
import type { Channel, Mix, InputDevice, OutputDevice } from '../src';

// Shorthand to access @internal methods without TypeScript complaints.
const int = (c: WaveLinkController) => c as any;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mixPersonal: Mix = { id: 'mx-personal', name: 'Personal Mix', isMuted: false, level: 1.0 };
const mixStream: Mix   = { id: 'mx-stream',   name: 'Stream Mix',   isMuted: false, level: 0.8 };

const chGame: Channel = {
  id: 'ch-game', name: 'Game', type: 'game',
  isMuted: false, level: 0.5,
  mixes: [
    { id: 'mx-personal', isMuted: false, level: 0.9 },
    { id: 'mx-stream',   isMuted: false, level: 0.7 },
  ],
  effects: [],
};

const chDiscord: Channel = {
  id: 'ch-discord', name: 'Discord', type: 'voice',
  isMuted: false, level: 0.5,
  mixes: [
    { id: 'mx-personal', isMuted: false, level: 0.9 },
    { id: 'mx-stream',   isMuted: false, level: 0.7 },
  ],
  effects: [],
};

const chMusic: Channel = {
  id: 'ch-music', name: 'Music', type: 'music',
  isMuted: false, level: 0.8,
  mixes: [
    { id: 'mx-personal', isMuted: false, level: 0.8 },
    { id: 'mx-stream',   isMuted: false, level: 0.6 },
  ],
  effects: [],
};

const chMic: Channel = {
  id: 'ch-mic', name: 'Microphone', type: 'wave',
  isMuted: false, level: 0.9,
  mixes: [
    { id: 'mx-personal', isMuted: false, level: 1.0 },
    { id: 'mx-stream',   isMuted: false, level: 0.9 },
  ],
  effects: [
    { id: 'effect-noise-gate', isEnabled: true },
    { id: 'effect-compressor', isEnabled: true },
  ],
};

const waveMic: InputDevice = {
  id: 'idev-wave', name: 'Wave:3', isWaveDevice: true,
  inputs: [
    {
      id: 'in-wave', name: 'Microphone', isMuted: false,
      gain: { value: 12 },
      micPcMix: { value: 0.5 },
      dspEffects: [],
      effects: [],
    },
  ],
};

const virtualDevice: InputDevice = {
  id: 'idev-virtual', name: 'Virtual Input', isWaveDevice: false,
  inputs: [],
};

const outDevice1: OutputDevice = {
  id: 'odev-1', name: 'Headphones', isWaveDevice: true,
  outputs: [
    { id: 'out-1a', name: 'Headphones Out', isMuted: false, level: 0.9, mixId: 'mx-personal' },
  ],
};

const outDevice2: OutputDevice = {
  id: 'odev-2', name: 'Speakers', isWaveDevice: false,
  outputs: [
    { id: 'out-2a', name: 'Speakers Out', isMuted: false, level: 0.8, mixId: 'mx-personal' },
  ],
};

// ---------------------------------------------------------------------------
// channel-volume — reading channel and mix state from events
// ---------------------------------------------------------------------------

describe('channel-volume: reading channel and mix changes', () => {
  let ctrl: WaveLinkController;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    int(ctrl)._setChannels([{ ...chGame }, { ...chMusic }]);
    int(ctrl)._setMixes([{ ...mixPersonal }, { ...mixStream }]);
  });

  it('getChannels returns all loaded channels', () => {
    expect(ctrl.getChannels().map(c => c.name)).toEqual(['Game', 'Music']);
  });

  it('getMixes returns all loaded mixes', () => {
    expect(ctrl.getMixes().map(m => m.name)).toEqual(['Personal Mix', 'Stream Mix']);
  });

  it('channelChanged with level delivers the updated level via getChannelById', () => {
    ctrl.getChannelById('ch-game')!.level = 0.65;

    let capturedLevel = -1;
    ctrl.on('channelChanged', (id, _mixIds, changedProperties) => {
      if (changedProperties.includes('level')) {
        capturedLevel = ctrl.getChannelById(id)!.level;
      }
    });

    int(ctrl).emit('channelChanged', 'ch-game', ['mx-personal', 'mx-stream'], ['level']);
    expect(capturedLevel).toBe(0.65);
  });

  it('channelChanged with isMuted delivers the updated mute state', () => {
    ctrl.getChannelById('ch-game')!.isMuted = true;

    let capturedMuted: boolean | undefined;
    ctrl.on('channelChanged', (id, _mixIds, changedProperties) => {
      if (changedProperties.includes('isMuted')) {
        capturedMuted = ctrl.getChannelById(id)!.isMuted;
      }
    });

    int(ctrl).emit('channelChanged', 'ch-game', ['mx-personal', 'mx-stream'], ['isMuted']);
    expect(capturedMuted).toBe(true);
  });

  it('channelChanged for unknown properties does not read level or mute', () => {
    const spy = jest.fn();
    ctrl.on('channelChanged', (_id, _mixIds, changedProperties) => {
      if (changedProperties.includes('level') || changedProperties.includes('isMuted')) {
        spy();
      }
    });

    int(ctrl).emit('channelChanged', 'ch-game', [], ['name']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('mixChanged delivers the updated level and mute state via getMixById', () => {
    const mix = ctrl.getMixById('mx-stream')!;
    mix.level = 0.4;
    mix.isMuted = true;

    let captured: { level: number; isMuted: boolean } | undefined;
    ctrl.on('mixChanged', (id) => {
      const m = ctrl.getMixById(id)!;
      captured = { level: m.level, isMuted: m.isMuted };
    });

    int(ctrl).emit('mixChanged', 'mx-stream');
    expect(captured).toEqual({ level: 0.4, isMuted: true });
  });
});

// ---------------------------------------------------------------------------
// wave-gain — Wave device state and hardware input changes
// ---------------------------------------------------------------------------

describe('wave-gain: Wave device state', () => {
  let ctrl: WaveLinkController;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    int(ctrl)._setInputDevices([{ ...waveMic, inputs: [{ ...waveMic.inputs[0] }] }, { ...virtualDevice }]);
  });

  it('getWaveInputDevices returns only isWaveDevice === true', () => {
    const wave = ctrl.getWaveInputDevices();
    expect(wave).toHaveLength(1);
    expect(wave[0].name).toBe('Wave:3');
  });

  it('Wave device inputs have numeric gain and micPcMix values', () => {
    const input = ctrl.getWaveInputDevices()[0].inputs[0];
    expect(typeof input.gain.value).toBe('number');
    expect(typeof input.micPcMix.value).toBe('number');
  });

  it('micPcMix value is in 0–1 range', () => {
    const input = ctrl.getWaveInputDevices()[0].inputs[0];
    expect(input.micPcMix.value).toBeGreaterThanOrEqual(0);
    expect(input.micPcMix.value).toBeLessThanOrEqual(1);
  });

  it('inputDeviceChanged event delivers the device id and updated state is accessible', () => {
    ctrl.getInputDeviceById('idev-wave')!.inputs[0].gain.value = 18;

    let receivedId: string | undefined;
    ctrl.on('inputDeviceChanged', (id) => { receivedId = id; });

    int(ctrl).emit('inputDeviceChanged', 'idev-wave');

    expect(receivedId).toBe('idev-wave');
    expect(ctrl.getInputDeviceById('idev-wave')!.inputs[0].gain.value).toBe(18);
  });

  it('virtual devices are not returned by getWaveInputDevices', () => {
    expect(ctrl.getWaveInputDevices().every(d => d.isWaveDevice)).toBe(true);
    expect(ctrl.getWaveInputDevices().find(d => d.name === 'Virtual Input')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// level-meters — meter state structure
// ---------------------------------------------------------------------------

describe('level-meters: VU meter state', () => {
  let ctrl: WaveLinkController;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    int(ctrl)._setChannels([{ ...chGame }, { ...chMusic }]);
    int(ctrl)._setMixes([{ ...mixPersonal }, { ...mixStream }]);
  });

  it('getLevelMeters returns the correct empty initial structure', () => {
    expect(ctrl.getLevelMeters()).toEqual({
      inputDevices: [],
      outputDevices: [],
      channels: [],
      mixes: [],
    });
  });

  it('levelMeterChanged fires and the updated channel meters are accessible', (done) => {
    ctrl.on('levelMeterChanged', () => {
      const meters = ctrl.getLevelMeters();
      expect(meters.channels).toHaveLength(1);
      done();
    });

    // Simulate a server push: directly mutate the internal meters object, then emit.
    const lm = int(ctrl)._getLevelMeters();
    lm.channels.push({ id: 'ch-game', levelLeftPercentage: 42, levelRightPercentage: 38 });
    int(ctrl).emit('levelMeterChanged');
  });

  it('meter entries include the expected shape', (done) => {
    ctrl.on('levelMeterChanged', () => {
      const entry = ctrl.getLevelMeters().channels[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('levelLeftPercentage');
      expect(entry).toHaveProperty('levelRightPercentage');
      done();
    });

    const lm = int(ctrl)._getLevelMeters();
    lm.channels.push({ id: 'ch-music', levelLeftPercentage: 55, levelRightPercentage: 60 });
    int(ctrl).emit('levelMeterChanged');
  });

  it('channel name can be resolved from a meter entry id via getChannelById', () => {
    const lm = int(ctrl)._getLevelMeters();
    lm.channels.push({ id: 'ch-game', levelLeftPercentage: 10, levelRightPercentage: 12 });

    for (const m of ctrl.getLevelMeters().channels) {
      expect(ctrl.getChannelById(m.id)?.name).toBe('Game');
    }
  });

  it('mix meters are stored separately from channel meters', (done) => {
    ctrl.on('levelMeterChanged', () => {
      const meters = ctrl.getLevelMeters();
      expect(meters.channels).toHaveLength(1);
      expect(meters.mixes).toHaveLength(1);
      done();
    });

    const lm = int(ctrl)._getLevelMeters();
    lm.channels.push({ id: 'ch-game',    levelLeftPercentage: 20, levelRightPercentage: 22 });
    lm.mixes.push(   { id: 'mx-personal', levelLeftPercentage: 80, levelRightPercentage: 78 });
    int(ctrl).emit('levelMeterChanged');
  });
});

// ---------------------------------------------------------------------------
// focused-app — app routing logic
// ---------------------------------------------------------------------------

describe('focused-app: focused app routing', () => {
  let ctrl: WaveLinkController;
  let addToChannelSpy: jest.SpyInstance;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    addToChannelSpy = jest.spyOn(ctrl, 'addToChannel').mockImplementation(() => {});
    int(ctrl)._setChannels([{ ...chGame }, { ...chMusic }]);
  });

  afterEach(() => {
    addToChannelSpy.mockRestore();
  });

  function attachFocusedAppLogic(targetChannelName = 'Game') {
    ctrl.on('focusedAppChanged', (app) => {
      const channel = ctrl.getChannels().find(c => c.name === targetChannelName);
      if (channel && app.id) {
        ctrl.addToChannel(app.id, channel.id);
      }
    });
  }

  it('focusedAppChanged delivers app name and id', (done) => {
    ctrl.on('focusedAppChanged', (app) => {
      expect(app.name).toBe('Spotify');
      expect(app.id).toBe('com.spotify');
      done();
    });

    int(ctrl).emit('focusedAppChanged', { id: 'com.spotify', name: 'Spotify', channel: { id: '' } });
  });

  it('calls addToChannel with the app id and the matching channel id', () => {
    attachFocusedAppLogic('Game');
    int(ctrl).emit('focusedAppChanged', { id: 'com.overwolf', name: 'Overwolf', channel: { id: '' } });
    expect(addToChannelSpy).toHaveBeenCalledWith('com.overwolf', 'ch-game');
  });

  it('does not call addToChannel when the target channel does not exist', () => {
    attachFocusedAppLogic('NonExistentChannel');
    int(ctrl).emit('focusedAppChanged', { id: 'com.spotify', name: 'Spotify', channel: { id: '' } });
    expect(addToChannelSpy).not.toHaveBeenCalled();
  });

  it('does not call addToChannel when app id is empty (no focused app)', () => {
    attachFocusedAppLogic('Game');
    int(ctrl).emit('focusedAppChanged', { id: '', name: '--', channel: { id: '' } });
    expect(addToChannelSpy).not.toHaveBeenCalled();
  });

  it('routes to the correct channel id regardless of channel order', () => {
    // Music is first in the list this time
    int(ctrl)._setChannels([{ ...chMusic }, { ...chGame }]);
    attachFocusedAppLogic('Game');
    int(ctrl).emit('focusedAppChanged', { id: 'com.valorant', name: 'VALORANT', channel: { id: '' } });
    expect(addToChannelSpy).toHaveBeenCalledWith('com.valorant', 'ch-game');
  });
});

// ---------------------------------------------------------------------------
// duck-music — threshold-based ducking state machine
// ---------------------------------------------------------------------------

describe('duck-music: auto-ducking logic', () => {
  const MUSIC_CHANNEL_NAME = 'Music';
  const DUCK_THRESHOLD = 0.7;
  const DUCKED_LEVEL   = 0.3;
  const RESTORE_LEVEL  = 0.8;

  let ctrl: WaveLinkController;
  let setChannelSpy: jest.SpyInstance;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    setChannelSpy = jest.spyOn(ctrl, 'setChannel').mockImplementation(() => {});
    int(ctrl)._setChannels([
      { ...chGame,  level: 0.5 },
      { ...chMusic, level: 0.8 },
    ]);
  });

  afterEach(() => {
    setChannelSpy.mockRestore();
  });

  /** Attaches the duck-music event handler and returns a getter for isDucked. */
  function attachDuckLogic(): () => boolean {
    let isDucked = false;
    ctrl.on('channelChanged', (id, _mixIds, changedProperties) => {
      if (!changedProperties.includes('level')) return;
      const changed = ctrl.getChannelById(id);
      if (!changed || changed.name === MUSIC_CHANNEL_NAME) return;
      const music = ctrl.getChannels().find(c => c.name === MUSIC_CHANNEL_NAME);
      if (!music) return;
      const shouldDuck = changed.level >= DUCK_THRESHOLD;
      if (shouldDuck && !isDucked) {
        isDucked = true;
        ctrl.setChannel({ id: music.id, level: DUCKED_LEVEL });
      } else if (!shouldDuck && isDucked) {
        isDucked = false;
        ctrl.setChannel({ id: music.id, level: RESTORE_LEVEL });
      }
    });
    return () => isDucked;
  }

  it('calls setChannel with DUCKED_LEVEL when a channel exceeds the threshold', () => {
    attachDuckLogic();
    ctrl.getChannelById('ch-game')!.level = 0.75;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(setChannelSpy).toHaveBeenCalledWith({ id: 'ch-music', level: DUCKED_LEVEL });
  });

  it('does not duck when the channel level is exactly at the threshold boundary (below)', () => {
    attachDuckLogic();
    ctrl.getChannelById('ch-game')!.level = 0.69;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });

  it('sets isDucked = true after the first duck', () => {
    const getIsDucked = attachDuckLogic();
    ctrl.getChannelById('ch-game')!.level = 0.8;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(getIsDucked()).toBe(true);
  });

  it('ducks only once even if multiple events fire while already above threshold', () => {
    attachDuckLogic();
    const game = ctrl.getChannelById('ch-game')!;
    game.level = 0.8;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    game.level = 0.9;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(setChannelSpy).toHaveBeenCalledTimes(1);
    expect(setChannelSpy).toHaveBeenCalledWith({ id: 'ch-music', level: DUCKED_LEVEL });
  });

  it('restores music to RESTORE_LEVEL when the trigger channel drops below threshold', () => {
    attachDuckLogic();
    const game = ctrl.getChannelById('ch-game')!;
    // Duck first
    game.level = 0.8;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    // Then restore
    game.level = 0.5;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(setChannelSpy).toHaveBeenCalledTimes(2);
    expect(setChannelSpy).toHaveBeenNthCalledWith(2, { id: 'ch-music', level: RESTORE_LEVEL });
  });

  it('ignores channelChanged events on the music channel itself', () => {
    attachDuckLogic();
    ctrl.getChannelById('ch-music')!.level = 0.9;
    int(ctrl).emit('channelChanged', 'ch-music', [], ['level']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });

  it('ignores channelChanged events where level is not in changedProperties', () => {
    attachDuckLogic();
    ctrl.getChannelById('ch-game')!.level = 0.8;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['isMuted']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sync-channel-mutes — mute mirroring logic
// ---------------------------------------------------------------------------

describe('sync-channel-mutes: mute mirroring', () => {
  const LINKED_CHANNELS = ['Game', 'Discord'];

  let ctrl: WaveLinkController;
  let setChannelSpy: jest.SpyInstance;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    setChannelSpy = jest.spyOn(ctrl, 'setChannel').mockImplementation(() => {});
    int(ctrl)._setChannels([
      { ...chGame,    isMuted: false },
      { ...chDiscord, isMuted: false },
      { ...chMusic,   isMuted: false },
    ]);
  });

  afterEach(() => {
    setChannelSpy.mockRestore();
  });

  function attachSyncLogic() {
    ctrl.on('channelChanged', (id, _mixIds, changedProperties) => {
      if (!changedProperties.includes('isMuted')) return;
      const source = ctrl.getChannelById(id);
      if (!source || !LINKED_CHANNELS.includes(source.name)) return;
      const peers = ctrl.getChannels().filter(
        c => LINKED_CHANNELS.includes(c.name) && c.id !== id && c.isMuted !== source.isMuted
      );
      for (const peer of peers) {
        ctrl.setChannel({ id: peer.id, isMuted: source.isMuted });
      }
    });
  }

  it('muting Game causes setChannel to be called for Discord', () => {
    attachSyncLogic();
    ctrl.getChannelById('ch-game')!.isMuted = true;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['isMuted']);
    expect(setChannelSpy).toHaveBeenCalledWith({ id: 'ch-discord', isMuted: true });
  });

  it('un-muting Discord calls setChannel to un-mute Game', () => {
    attachSyncLogic();
    ctrl.getChannelById('ch-game')!.isMuted = true;    // Game is already muted
    ctrl.getChannelById('ch-discord')!.isMuted = false; // Discord just un-muted
    int(ctrl).emit('channelChanged', 'ch-discord', [], ['isMuted']);
    expect(setChannelSpy).toHaveBeenCalledWith({ id: 'ch-game', isMuted: false });
  });

  it('does not call setChannel when the peer already has the same mute state', () => {
    attachSyncLogic();
    ctrl.getChannelById('ch-game')!.isMuted = true;
    ctrl.getChannelById('ch-discord')!.isMuted = true; // already in sync
    int(ctrl).emit('channelChanged', 'ch-game', [], ['isMuted']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });

  it('does not sync channels outside the linked group', () => {
    attachSyncLogic();
    ctrl.getChannelById('ch-music')!.isMuted = true;
    int(ctrl).emit('channelChanged', 'ch-music', [], ['isMuted']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });

  it('ignores channelChanged events where isMuted is not in changedProperties', () => {
    attachSyncLogic();
    ctrl.getChannelById('ch-game')!.isMuted = true;
    int(ctrl).emit('channelChanged', 'ch-game', [], ['level']);
    expect(setChannelSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// output-selector — output device management
// ---------------------------------------------------------------------------

describe('output-selector: output device management', () => {
  let ctrl: WaveLinkController;
  let setOutputDeviceSpy: jest.SpyInstance;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    setOutputDeviceSpy = jest.spyOn(ctrl, 'setOutputDevice').mockImplementation(() => {});
    int(ctrl)._setOutputDevices([
      { ...outDevice1, outputs: [{ ...outDevice1.outputs[0] }] },
      { ...outDevice2, outputs: [{ ...outDevice2.outputs[0] }] },
    ]);
    int(ctrl)._setMainOutput({ outputDeviceId: 'odev-1', outputId: 'out-1a' });
    int(ctrl)._setMixes([{ ...mixPersonal }, { ...mixStream }]);
  });

  afterEach(() => {
    setOutputDeviceSpy.mockRestore();
  });

  it('getOutputDevices returns all output devices', () => {
    expect(ctrl.getOutputDevices()).toHaveLength(2);
  });

  it('getMainOutput returns the current main output', () => {
    expect(ctrl.getMainOutput()).toEqual({ outputDeviceId: 'odev-1', outputId: 'out-1a' });
  });

  it('finds the first non-main output as a candidate', () => {
    const mainOutput = ctrl.getMainOutput();
    const candidate = ctrl.getOutputDevices()
      .flatMap(d => d.outputs.map(o => ({ deviceId: d.id, outputId: o.id })))
      .find(c => c.deviceId !== mainOutput.outputDeviceId || c.outputId !== mainOutput.outputId);

    expect(candidate).toEqual({ deviceId: 'odev-2', outputId: 'out-2a' });
  });

  it('calls setOutputDevice with the candidate output payload', () => {
    const mainOutput = ctrl.getMainOutput();
    const candidate = ctrl.getOutputDevices()
      .flatMap(d => d.outputs.map(o => ({ deviceId: d.id, outputId: o.id })))
      .find(c => c.deviceId !== mainOutput.outputDeviceId || c.outputId !== mainOutput.outputId);

    if (candidate) {
      ctrl.setOutputDevice({
        mainOutput: { outputDeviceId: candidate.deviceId, outputId: candidate.outputId },
      });
    }

    expect(setOutputDeviceSpy).toHaveBeenCalledWith({
      mainOutput: { outputDeviceId: 'odev-2', outputId: 'out-2a' },
    });
  });

  it('mainOutputDeviceChanged delivers the updated MainOutput', (done) => {
    ctrl.on('mainOutputDeviceChanged', (mo) => {
      expect(mo).toEqual({ outputDeviceId: 'odev-2', outputId: 'out-2a' });
      done();
    });

    int(ctrl)._setMainOutput({ outputDeviceId: 'odev-2', outputId: 'out-2a' });
    int(ctrl).emit('mainOutputDeviceChanged', { outputDeviceId: 'odev-2', outputId: 'out-2a' });
  });

  it('getOutputDeviceById resolves the device name from a MainOutput event', () => {
    expect(ctrl.getOutputDeviceById('odev-2')?.name).toBe('Speakers');
  });

  it('Wave output devices are filtered correctly', () => {
    const wave = ctrl.getWaveOutputDevices();
    expect(wave).toHaveLength(1);
    expect(wave[0].name).toBe('Headphones');
  });

  it('each output has level in 0–1 range', () => {
    for (const device of ctrl.getOutputDevices()) {
      for (const output of device.outputs) {
        expect(output.level).toBeGreaterThanOrEqual(0);
        expect(output.level).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// toggle-effects — effect toggling state machine
// ---------------------------------------------------------------------------

describe('toggle-effects: effect toggling', () => {
  let ctrl: WaveLinkController;
  let setChannelSpy: jest.SpyInstance;

  beforeEach(() => {
    ctrl = new WaveLinkController();
    setChannelSpy = jest.spyOn(ctrl, 'setChannel').mockImplementation(() => {});
    int(ctrl)._setChannels([{
      ...chMic,
      effects: [
        { id: 'effect-noise-gate', isEnabled: true },
        { id: 'effect-compressor', isEnabled: true },
      ],
    }]);
  });

  afterEach(() => {
    setChannelSpy.mockRestore();
  });

  /** Replicates the toggle logic from toggle-effects.ts. */
  function toggleEffects(channelId: string) {
    const channel = ctrl.getChannelById(channelId);
    if (!channel || channel.effects.length === 0) return;
    const allEnabled = channel.effects.every(e => e.isEnabled);
    ctrl.setChannel({
      id: channel.id,
      effects: channel.effects.map(e => ({ id: e.id, isEnabled: !allEnabled })),
    });
  }

  it('disables all effects when all are currently enabled', () => {
    toggleEffects('ch-mic');
    expect(setChannelSpy).toHaveBeenCalledWith({
      id: 'ch-mic',
      effects: [
        { id: 'effect-noise-gate', isEnabled: false },
        { id: 'effect-compressor', isEnabled: false },
      ],
    });
  });

  it('enables all effects when all are currently disabled', () => {
    const channel = ctrl.getChannelById('ch-mic')!;
    channel.effects = [
      { id: 'effect-noise-gate', isEnabled: false },
      { id: 'effect-compressor', isEnabled: false },
    ];

    toggleEffects('ch-mic');
    expect(setChannelSpy).toHaveBeenCalledWith({
      id: 'ch-mic',
      effects: [
        { id: 'effect-noise-gate', isEnabled: true },
        { id: 'effect-compressor', isEnabled: true },
      ],
    });
  });

  it('enables all effects when only some are enabled (mixed → all on)', () => {
    const channel = ctrl.getChannelById('ch-mic')!;
    channel.effects = [
      { id: 'effect-noise-gate', isEnabled: true },
      { id: 'effect-compressor', isEnabled: false },
    ];

    // allEnabled = false (one is off) → next = true
    toggleEffects('ch-mic');
    expect(setChannelSpy).toHaveBeenCalledWith({
      id: 'ch-mic',
      effects: [
        { id: 'effect-noise-gate', isEnabled: true },
        { id: 'effect-compressor', isEnabled: true },
      ],
    });
  });

  it('does nothing when the channel has no effects', () => {
    int(ctrl)._setChannels([{ ...chGame, effects: [] }]);
    toggleEffects('ch-game');
    expect(setChannelSpy).not.toHaveBeenCalled();
  });

  it('channelChanged with effects delivers the updated effects via getChannelById', (done) => {
    ctrl.on('channelChanged', (id, _mixIds, changedProperties) => {
      if (!changedProperties.includes('effects')) return;
      const channel = ctrl.getChannelById(id)!;
      expect(channel.effects).toEqual([
        { id: 'effect-noise-gate', isEnabled: false },
        { id: 'effect-compressor', isEnabled: false },
      ]);
      done();
    });

    // Simulate the server acknowledging the disable
    const channel = ctrl.getChannelById('ch-mic')!;
    channel.effects = [
      { id: 'effect-noise-gate', isEnabled: false },
      { id: 'effect-compressor', isEnabled: false },
    ];
    int(ctrl).emit('channelChanged', 'ch-mic', [], ['effects']);
  });

  it('repeated toggle calls alternate between enabled and disabled', () => {
    // First toggle: all enabled → disable all
    toggleEffects('ch-mic');
    const firstCall = setChannelSpy.mock.calls[0][0];
    expect(firstCall.effects.every((e: any) => !e.isEnabled)).toBe(true);

    // Simulate the server confirming the disable
    const channel = ctrl.getChannelById('ch-mic')!;
    channel.effects = firstCall.effects;

    // Second toggle: all disabled → enable all
    toggleEffects('ch-mic');
    const secondCall = setChannelSpy.mock.calls[1][0];
    expect(secondCall.effects.every((e: any) => e.isEnabled)).toBe(true);
  });
});
