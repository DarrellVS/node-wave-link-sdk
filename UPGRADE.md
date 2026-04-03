# Upgrade Guide — v1 → v2

Wave Link 3.x replaced the entire data model. This guide shows every common v1 pattern and its v2 equivalent side-by-side.

---

## Conceptual changes

| v1 concept | v2 replacement |
|---|---|
| `WaveLinkInputController` — one object per input | `Channel` — a plain data object; mutate via `setChannel()` |
| `WaveLinkOutputController` — single output | `Mix[]` — N named mixes (e.g. "Personal Mix", "Stream Mix") |
| `WaveLinkFilterController` — filter wrapper | `Effect` — plain `{ id, isEnabled }` inside a channel |
| Local mix / stream mix (hardcoded two-way split) | `Mix[]` — any number of mixes |
| `getInputConfigs` / `getOutputConfig` RPC | `getChannels` / `getMixes` / `getInputDevices` / `getOutputDevices` |
| Port 1824 (fixed) | Port read from `ws-info.json`; changes on every Wave Link restart |

The short version: v1 wrapped everything in stateful controller objects. v2 exposes plain data and lets you call `setChannel` / `setMix` / `setInputDevice` directly on the root controller.

---

## Installation

No new packages required. After upgrading, remove the old unused deps:

```bash
npm install @darrellvs/node-wave-link-sdk@^2.0.0
npm uninstall simple-jsonrpc-js events   # no longer needed
```

---

## Connecting

**v1**
```typescript
const controller = new WaveLinkController('127.0.0.1'); // host param
await controller.connect();                              // async, resolves when ready

controller.on('websocketOpen', () => { ... });
controller.on('websocketClose', () => { ... });
```

**v2**
```typescript
const controller = new WaveLinkController(); // no host param; port auto-discovered
controller.connect();                        // sync; listen to 'ready' instead

controller.on('ready', () => { ... });
controller.on('disconnected', () => { ... });
```

---

## Getting channels / inputs

**v1** — one `WaveLinkInputController` per input
```typescript
const inputs = controller.getInputs();          // WaveLinkInputController[]
const input  = controller.getInput({ name: 'System' });
const input2 = controller.getInput({ identifier: 'abc-123' });
```

**v2** — `Channel[]` for software mixer channels; `InputDevice[]` for hardware
```typescript
// Software mixer channels (what you mixed in v1)
const channels = controller.getChannels();                        // Channel[]
const channel  = controller.getChannels().find(c => c.name === 'System');
const channel2 = controller.getChannelById('abc-123');

// Physical hardware (Wave mic gain, micPcMix — new in v2)
const devices    = controller.getInputDevices();                  // InputDevice[]
const waveDevice = controller.getWaveInputDevices()[0];          // Wave mic only
```

---

## Getting the output

**v1** — single `WaveLinkOutputController`
```typescript
const output = controller.getOutput();
```

**v2** — `Mix[]` and `OutputDevice[]`
```typescript
const mixes         = controller.getMixes();                      // Mix[]
const localMix      = controller.getMixes().find(m => m.name === 'Personal Mix');
const streamMix     = controller.getMixes().find(m => m.name === 'Stream Mix');

const outputDevices = controller.getOutputDevices();             // OutputDevice[]
const mainOutput    = controller.getMainOutput();                // { outputDeviceId, outputId }
```

---

## Reading volume and mute

**v1**
```typescript
const vol        = input.localVolume;   // 0–100
const streamVol  = input.streamVolume;  // 0–100
const muted      = input.localMute;

const outVol     = output.localVolume;
const outMuted   = output.localMute;
```

**v2** — values are `0–1` everywhere
```typescript
const channel = controller.getChannelById(id);

const masterVol  = channel.level;                          // 0–1 master fader
const muted      = channel.isMuted;

// Per-mix send level (replaces "stream volume")
const streamMix  = controller.getMixes().find(m => m.name === 'Stream Mix');
const sendLevel  = channel.mixes.find(m => m.id === streamMix.id)?.level;

// Mix (output) volume
const mix        = controller.getMixById(mixId);
const mixVol     = mix.level;    // 0–1
const mixMuted   = mix.isMuted;
```

---

## Setting volume

**v1**
```typescript
input.localVolume  = 75;    // 0–100 integer
input.streamVolume = 50;
output.localVolume = 80;
```

**v2** — all `0–1` floats
```typescript
// Master channel fader
controller.setChannel({ id: channel.id, level: 0.75 });

// Per-mix send level
const streamMix = controller.getMixes().find(m => m.name === 'Stream Mix');
controller.setChannel({ id: channel.id, mixes: [{ id: streamMix.id, level: 0.5 }] });

// Mix (output) volume
controller.setMix({ id: mix.id, level: 0.8 });
```

---

## Setting mute

**v1**
```typescript
input.localMute   = true;
input.streamMute  = false;
input.muteLocal();
input.unmuteStream();

output.localMute  = true;
```

**v2**
```typescript
// Mute the channel master
controller.setChannel({ id: channel.id, isMuted: true });

// Mute only on a specific mix
const streamMix = controller.getMixes().find(m => m.name === 'Stream Mix');
controller.setChannel({ id: channel.id, mixes: [{ id: streamMix.id, isMuted: true }] });

// Mute a mix (output)
controller.setMix({ id: mix.id, isMuted: true });
```

---

## Listening to volume / mute changes

**v1** — per-input controller events
```typescript
input.on('localVolumeChanged',  (vol) => { ... });
input.on('streamVolumeChanged', (vol) => { ... });
input.on('localMuteChanged',    (muted) => { ... });
input.on('streamMuteChanged',   (muted) => { ... });

output.on('localVolumeChanged', (vol) => { ... });
output.on('localMuteChanged',   (muted) => { ... });
```

**v2** — one `channelChanged` / `mixChanged` event on the root controller
```typescript
controller.on('channelChanged', (id, _mixIds, changedProperties) => {
  const channel = controller.getChannelById(id);

  if (changedProperties.includes('level')) {
    console.log(`${channel.name} master level: ${channel.level}`);
  }
  if (changedProperties.includes('isMuted')) {
    console.log(`${channel.name} muted: ${channel.isMuted}`);
  }
  if (changedProperties.includes('mixes')) {
    // A per-mix send level or mute changed — inspect channel.mixes
    console.log('mix sends:', channel.mixes);
  }
});

controller.on('mixChanged', (id) => {
  const mix = controller.getMixById(id);
  console.log(`${mix.name} — level: ${mix.level}, muted: ${mix.isMuted}`);
});
```

---

## Filters / effects

**v1** — `WaveLinkFilterController` wrapper
```typescript
const filter = input.getFilter({ name: 'Noise Gate' });
filter.mute();
filter.unmute();
filter.on('muteChanged', (muted) => { ... });
```

**v2** — plain `Effect` objects; toggle via `setChannel`
```typescript
// Effects live directly on the channel
const effect = channel.effects.find(e => e.id === 'noise-gate-id');

// Toggle
controller.setChannel({
  id: channel.id,
  effects: [{ id: effect.id, isEnabled: !effect.isEnabled }],
});

// React to effect changes
controller.on('channelChanged', (id, _mixIds, changedProperties) => {
  if (changedProperties.includes('effects')) {
    const ch = controller.getChannelById(id);
    console.log('effects updated:', ch.effects);
  }
});
```

Note: v3 effects carry only `id` and `isEnabled` — display names are not provided by the protocol.

---

## Changing the main output device

**v1**
```typescript
output.on('selectedOutputChanged', (identifier) => { ... });
```

**v2**
```typescript
// Change it
controller.setOutputDevice({
  mainOutput: { outputDeviceId: 'device-uuid', outputId: 'output-uuid' },
});

// Listen for changes
controller.on('mainOutputDeviceChanged', (mainOutput) => {
  console.log('new main output:', mainOutput.outputDeviceId, mainOutput.outputId);
});
```

---

## Wave microphone hardware controls (new in v2)

These did not exist in v1. The Wave mic's hardware gain and mic/PC blend are now accessible.

```typescript
const waveDevice = controller.getWaveInputDevices()[0];
const micInput   = waveDevice.inputs[0];

// Read
console.log('gain:', micInput.gain.value, 'dB');
console.log('mic/PC mix:', micInput.micPcMix.value); // 0–1

// Set gain
controller.setInputDevice({
  id: waveDevice.id,
  inputs: [{ id: micInput.id, gain: { value: micInput.gain.value + 3 } }],
});

// Set mic/PC blend (0 = all mic, 1 = all PC)
controller.setInputDevice({
  id: waveDevice.id,
  inputs: [{ id: micInput.id, micPcMix: { value: 0.5 } }],
});

// Listen for hardware input changes
controller.on('inputDeviceChanged', (id) => {
  const device = controller.getInputDeviceById(id);
  console.log('updated:', device.inputs);
});
```

---

## Level meters (new in v2, opt-in)

```typescript
sdk.on('ready', () => {
  // Subscribe per-channel or per-mix
  for (const channel of sdk.getChannels()) {
    sdk.subscribeLevelMeter('channel', channel.id);
  }
});

sdk.on('levelMeterChanged', () => {
  const meters = sdk.getLevelMeters().channels;
  for (const m of meters) {
    const channel = sdk.getChannelById(m.id);
    console.log(`${channel?.name} L:${m.levelLeftPercentage.toFixed(1)}% R:${m.levelRightPercentage.toFixed(1)}%`);
  }
});
```

---

## Focused app routing (new in v2, opt-in)

```typescript
sdk.on('ready', () => sdk.subscribeFocusedApp());

sdk.on('focusedAppChanged', (app) => {
  console.log(`Focused: ${app.name} (${app.id})`);

  const gameChannel = sdk.getChannels().find(c => c.name === 'Game');
  if (gameChannel) sdk.addToChannel(app.id, gameChannel.id);
});
```

---

## Event reference

| v1 event | v2 event | Notes |
|---|---|---|
| `websocketOpen` | *(removed)* | Use `ready` |
| `websocketClose` | `disconnected` | Only fires after a previously-established session drops |
| `ready` | `ready` | Same |
| `inputMuteChanged` | `channelChanged` | Check `changedProperties.includes('isMuted')` |
| `inputVolumeChanged` | `channelChanged` | Check `changedProperties.includes('level')` |
| `inputNameChanged` | `channelChanged` | Check `changedProperties.includes('name')` |
| `outputMuteChanged` | `mixChanged` | Check the mix ID |
| `outputVolumeChanged` | `mixChanged` | Same |
| `selectedOutputChanged` | `mainOutputDeviceChanged` | Payload is `MainOutput` instead of a string |
| `filterChanged` | `channelChanged` | Check `changedProperties.includes('effects')` |
| `filterAdded` / `filterRemoved` | `channelChanged` | Same |
| `filterBypassStateChanged` | *(removed)* | No per-bypass concept in v3 |
| `inputsChanged` | `channelsChanged` | Entire channel list replaced |
| — | `inputDevicesChanged` | Hardware device list replaced |
| — | `inputDeviceChanged` | One hardware device partially updated |
| — | `outputDevicesChanged` | Output device list replaced |
| — | `outputDeviceChanged` | One output device partially updated |
| — | `mixesChanged` | Entire mix list replaced |
| — | `levelMeterChanged` | Opt-in via `subscribeLevelMeter()` |
| — | `focusedAppChanged` | Opt-in via `subscribeFocusedApp()` |
