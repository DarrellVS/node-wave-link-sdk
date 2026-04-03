# Examples

Runnable scripts showcasing the Wave Link SDK v2 API. Each example imports directly from `../src`, so no build step is needed — just run via the npm scripts below.

---

## Running an example

```bash
npm run example:<name>
```

---

## Basic examples

### channel-volume

Connects to Wave Link, prints all channels and mixes on startup, then logs every master-level and mute change in real time.

**Concepts:** `getChannels`, `getMixes`, `channelChanged`, `mixChanged`

```bash
npm run example:channels
```

---

### wave-gain

Prints the hardware gain (dB) and mic/PC blend value of every physical Wave microphone, then logs hardware changes as they happen.

**Concepts:** `getWaveInputDevices`, `inputDeviceChanged`, `setInputDevice`

```bash
npm run example:gain
```

---

### level-meters

Subscribes to VU meter push updates for all channels and mixes, and redraws a live level display in the terminal on every update.

**Concepts:** `subscribeLevelMeter`, `getLevelMeters`, `levelMeterChanged`

```bash
npm run example:meters
```

---

### focused-app

Subscribes to OS-focus notifications and automatically routes whichever application the user switches to into the "Game" channel.

**Concepts:** `subscribeFocusedApp`, `focusedAppChanged`, `addToChannel`

```bash
npm run example:focused
```

---

## Advanced examples

### duck-music

Automatically lowers the "Music" channel when any other channel's volume crosses a threshold, then restores it when the volume drops back down. Demonstrates stateful event handling across multiple `channelChanged` events.

**Concepts:** `channelChanged`, `setChannel`, stateful event handler

```bash
npm run example:duck
```

---

### sync-channel-mutes

Keeps a configurable group of channels muted or unmuted together. Muting any channel in the group immediately mutes all the others, and un-muting one un-mutes the rest. Only channels whose mute state differs from the source are updated.

**Concepts:** `channelChanged`, `setChannel`, channel filtering

```bash
npm run example:sync-mutes
```

---

### output-selector

Prints all available output devices alongside their mix assignments and current levels, marks the active main output, then demonstrates switching the main output programmatically and restoring it after 5 seconds.

**Concepts:** `getOutputDevices`, `getMainOutput`, `setOutputDevice`, `mainOutputDeviceChanged`

```bash
npm run example:output
```

---

### toggle-effects

Lists all effects configured on a target channel, then toggles them all on and off on a fixed interval so you can hear the before/after difference. Demonstrates reading and writing the `effects` array on a channel.

**Concepts:** `getChannels`, `setChannel` (effects payload), `channelChanged`

```bash
npm run example:effects
```
