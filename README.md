# @darrellvs/node-wave-link-sdk

An unofficial SDK for Elgato's Wave Link

## Introduction

This package provides you with utilities to manipulate and read the Wave Link application from your own code base.\
Having reverse engineered the Wave Link plugin for Elgato's StreamDeck, I was able to create an SDK for communicating with Wave Link's RPC.

## Installation

Install @darrellvs/node-wave-link-sdk with npm

```bash
  npm install @darrellvs/node-wave-link-sdk
```

or yarn

```bash
  yarn add @darrellvs/node-wave-link-sdk
```

or (if you dare) pnpm

```bash
  pnpm add @darrellvs/node-wave-link-sdk
```

## Features

- Changing input and output volume
  - For both local and mixer streams
- Changing input and output mute states
  - For both local and mixer streams
- Changing filter mute states
  - For local and mixer streams;
  - As well as individual filters
- Fully typed class-first interface

#### All communication is bi-directional, and thus allows you to listen for changes:

```typescript
// Log the local volume whenever it changes
output.on('localVolumeChanged', (volume) => {
  console.log('Local volume changed', volume);
});
```

More extensive examples available [here!](https://github.com/DarrellVS/node-wave-link-sdk/tree/main/examples)

## Notes

#### I will not be actively updating this library

As long as Elgato doesn't break anything.\
Minor issues may be patched, major issues may or may not 👀

Feel free to open a PR adding your own contributions 🚀
