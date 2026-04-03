# @darrellvs/node-wave-link-sdk

An unofficial SDK for Elgato's Wave Link (v2 — targets Wave Link 3.x)

## Introduction

This package provides utilities to manipulate and read the Wave Link application from your own codebase.\
Having reverse engineered the Wave Link plugin for Elgato's StreamDeck, I was able to create an SDK for communicating with Wave Link's WebSocket RPC.

> **Upgrading from v1?** See **[UPGRADE.md](./UPGRADE.md)** for a full before/after migration guide.

## Installation

```bash
npm install @darrellvs/node-wave-link-sdk
```

```bash
yarn add @darrellvs/node-wave-link-sdk
```

```bash
pnpm add @darrellvs/node-wave-link-sdk
```

## Features

- **Auto port discovery** — reads Wave Link's `ws-info.json` at startup; falls back to port scanning if unavailable
- **Channels** — read and set master level, mute, per-mix send levels, and effects on any software mixer channel
- **Mixes** — N named mixes (e.g. "Personal Mix", "Stream Mix") replacing the old hardcoded local/stream split
- **Input devices** — access physical Wave microphone hardware controls (gain, mic/PC blend)
- **Output devices** — read and change output device assignments and the main output selection
- **Level meters** — opt-in push updates for VU meters (per channel or per mix)
- **Focused app routing** — opt-in push updates for the OS-focused application; route it to any channel
- **Fully typed** — all data types exported from the package root

## Quick start

```typescript
import { WaveLinkController } from '@darrellvs/node-wave-link-sdk';

const sdk = new WaveLinkController();

sdk.on('ready', () => {
  const channels = sdk.getChannels();
  console.log('Channels:', channels.map(c => c.name));

  const mixes = sdk.getMixes();
  console.log('Mixes:', mixes.map(m => m.name));
});

sdk.on('disconnected', () => console.log('Wave Link disconnected'));

sdk.connect();
```

## Listening for changes

All communication is bi-directional. Listen for changes on the root controller:

```typescript
sdk.on('channelChanged', (id, _mixIds, changedProperties) => {
  const channel = sdk.getChannelById(id);
  if (changedProperties.includes('level')) {
    console.log(`${channel.name} level: ${channel.level}`);
  }
});

sdk.on('mixChanged', (id) => {
  const mix = sdk.getMixById(id);
  console.log(`${mix.name} — level: ${mix.level}, muted: ${mix.isMuted}`);
});
```

More extensive examples available [here](https://github.com/DarrellVS/node-wave-link-sdk/tree/v2/examples).

## Notes

#### I will not be actively updating this library

As long as Elgato doesn't break anything.\
Minor issues may be patched, major feature requests may or may not be implemented.

Feel free to open a PR adding your own contributions!
