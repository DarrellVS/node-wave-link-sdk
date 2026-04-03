/**
 * Integration tests — require Wave Link 3.x to be running.
 *
 * A single shared controller is connected once in beforeAll and disconnected
 * in afterAll, so Wave Link only sees one connection for the whole suite.
 */

import { WaveLinkController } from '../src';
import type { Channel, Mix, InputDevice, OutputDevice } from '../src';

jest.setTimeout(15000);

let ctrl: WaveLinkController;

beforeAll(async () => {
  ctrl = new WaveLinkController();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for ready')), 12000);
    ctrl.on('ready', () => { clearTimeout(timer); resolve(); });
    ctrl.connect();
  });
});

afterAll(() => {
  ctrl.disconnect();
});

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

describe('Connection', () => {
  it('isConnected() is true after ready', () => {
    expect(ctrl.isConnected()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

describe('Channels', () => {
  let channels: Channel[];

  beforeAll(() => {
    channels = ctrl.getChannels();
  });

  it('returns at least one channel', () => {
    expect(channels.length).toBeGreaterThan(0);
  });

  it('each channel has required fields', () => {
    for (const ch of channels) {
      expect(typeof ch.id).toBe('string');
      expect(ch.id.length).toBeGreaterThan(0);
      expect(typeof ch.name).toBe('string');
      expect(typeof ch.isMuted).toBe('boolean');
      expect(typeof ch.level).toBe('number');
      expect(ch.level).toBeGreaterThanOrEqual(0);
      expect(ch.level).toBeLessThanOrEqual(1);
      expect(Array.isArray(ch.mixes)).toBe(true);
      expect(Array.isArray(ch.effects)).toBe(true);
    }
  });

  it('each channel has at least one mix send', () => {
    for (const ch of channels) {
      expect(ch.mixes.length).toBeGreaterThan(0);
    }
  });

  it('each channel mix send has valid level and isMuted', () => {
    for (const ch of channels) {
      for (const m of ch.mixes) {
        expect(typeof m.id).toBe('string');
        expect(typeof m.level).toBe('number');
        expect(m.level).toBeGreaterThanOrEqual(0);
        expect(m.level).toBeLessThanOrEqual(1);
        expect(typeof m.isMuted).toBe('boolean');
      }
    }
  });

  it('getChannelById() finds channels returned by getChannels()', () => {
    for (const ch of channels) {
      expect(ctrl.getChannelById(ch.id)).toBe(ch);
    }
  });

  it('getChannelById() returns undefined for unknown id', () => {
    expect(ctrl.getChannelById('__not_a_real_id__')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Mixes
// ---------------------------------------------------------------------------

describe('Mixes', () => {
  let mixes: Mix[];

  beforeAll(() => {
    mixes = ctrl.getMixes();
  });

  it('returns at least one mix', () => {
    expect(mixes.length).toBeGreaterThan(0);
  });

  it('each mix has required fields', () => {
    for (const m of mixes) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.name).toBe('string');
      expect(typeof m.isMuted).toBe('boolean');
      expect(typeof m.level).toBe('number');
      expect(m.level).toBeGreaterThanOrEqual(0);
      expect(m.level).toBeLessThanOrEqual(1);
    }
  });

  it('getMixById() finds mixes returned by getMixes()', () => {
    for (const m of mixes) {
      expect(ctrl.getMixById(m.id)).toBe(m);
    }
  });

  it('getMixById() returns undefined for unknown id', () => {
    expect(ctrl.getMixById('__not_a_real_id__')).toBeUndefined();
  });

  it('channel mix send IDs reference mixes that exist in getMixes()', () => {
    const mixIds = new Set(mixes.map((m) => m.id));
    for (const ch of ctrl.getChannels()) {
      for (const send of ch.mixes) {
        expect(mixIds.has(send.id)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Input devices
// ---------------------------------------------------------------------------

describe('Input devices', () => {
  let devices: InputDevice[];

  beforeAll(() => {
    devices = ctrl.getInputDevices();
  });

  it('returns at least one input device', () => {
    expect(devices.length).toBeGreaterThan(0);
  });

  it('each device has required fields', () => {
    for (const d of devices) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.name).toBe('string');
      expect(typeof d.isWaveDevice).toBe('boolean');
      expect(Array.isArray(d.inputs)).toBe(true);
    }
  });

  it('each input has gain, micPcMix, and effect arrays', () => {
    for (const d of devices) {
      for (const inp of d.inputs) {
        expect(typeof inp.id).toBe('string');
        expect(typeof inp.isMuted).toBe('boolean');
        expect(typeof inp.gain.value).toBe('number');
        expect(typeof inp.micPcMix.value).toBe('number');
        expect(inp.micPcMix.value).toBeGreaterThanOrEqual(0);
        expect(inp.micPcMix.value).toBeLessThanOrEqual(1);
        expect(Array.isArray(inp.effects)).toBe(true);
        expect(Array.isArray(inp.dspEffects)).toBe(true);
      }
    }
  });

  it('getInputDeviceById() finds devices returned by getInputDevices()', () => {
    for (const d of devices) {
      expect(ctrl.getInputDeviceById(d.id)).toBe(d);
    }
  });

  it('getWaveInputDevices() is a subset of getInputDevices() with isWaveDevice true', () => {
    const waveDevices = ctrl.getWaveInputDevices();
    for (const d of waveDevices) {
      expect(d.isWaveDevice).toBe(true);
      expect(devices).toContain(d);
    }
  });
});

// ---------------------------------------------------------------------------
// Output devices
// ---------------------------------------------------------------------------

describe('Output devices', () => {
  let devices: OutputDevice[];

  beforeAll(() => {
    devices = ctrl.getOutputDevices();
  });

  it('returns at least one output device', () => {
    expect(devices.length).toBeGreaterThan(0);
  });

  it('each device has required fields', () => {
    for (const d of devices) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.name).toBe('string');
      expect(typeof d.isWaveDevice).toBe('boolean');
      expect(Array.isArray(d.outputs)).toBe(true);
    }
  });

  it('each output has level, isMuted, and a mixId string', () => {
    for (const d of devices) {
      for (const out of d.outputs) {
        expect(typeof out.id).toBe('string');
        expect(typeof out.isMuted).toBe('boolean');
        expect(typeof out.level).toBe('number');
        expect(out.level).toBeGreaterThanOrEqual(0);
        expect(out.level).toBeLessThanOrEqual(1);
        expect(typeof out.mixId).toBe('string'); // may be "" if not assigned
      }
    }
  });

  it('getOutputDeviceById() finds devices returned by getOutputDevices()', () => {
    for (const d of devices) {
      expect(ctrl.getOutputDeviceById(d.id)).toBe(d);
    }
  });

  it('getWaveOutputDevices() is a subset of getOutputDevices() with isWaveDevice true', () => {
    const waveDevices = ctrl.getWaveOutputDevices();
    for (const d of waveDevices) {
      expect(d.isWaveDevice).toBe(true);
      expect(devices).toContain(d);
    }
  });

  it('non-empty output mixId references a mix that exists in getMixes()', () => {
    const mixIds = new Set(ctrl.getMixes().map((m) => m.id));
    for (const d of devices) {
      for (const out of d.outputs) {
        // mixId is "" when the output is not assigned to any mix — skip those
        if (out.mixId !== '') {
          expect(mixIds.has(out.mixId)).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Main output
// ---------------------------------------------------------------------------

describe('Main output', () => {
  it('has a non-empty outputDeviceId', () => {
    const main = ctrl.getMainOutput();
    expect(typeof main.outputDeviceId).toBe('string');
    expect(main.outputDeviceId.length).toBeGreaterThan(0);
  });

  it('outputDeviceId references a device in getOutputDevices()', () => {
    const main = ctrl.getMainOutput();
    expect(ctrl.getOutputDeviceById(main.outputDeviceId)).toBeDefined();
  });

  it('outputId, when present, references an output within the main output device', () => {
    const main = ctrl.getMainOutput();
    if (main.outputId === undefined) return; // single-output device omits this field
    const device = ctrl.getOutputDeviceById(main.outputDeviceId);
    const output = device?.outputs.find((o) => o.id === main.outputId);
    expect(output).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Level meters structure
// ---------------------------------------------------------------------------

describe('getLevelMeters()', () => {
  it('returns correct structure before any subscription', () => {
    const lm = ctrl.getLevelMeters();
    expect(Array.isArray(lm.inputDevices)).toBe(true);
    expect(Array.isArray(lm.outputDevices)).toBe(true);
    expect(Array.isArray(lm.channels)).toBe(true);
    expect(Array.isArray(lm.mixes)).toBe(true);
  });
});
