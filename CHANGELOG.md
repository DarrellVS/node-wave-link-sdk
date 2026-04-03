# Changelog

## [2.0.0] — 2026-04-03

**Breaking change.** Full rewrite targeting Wave Link 3.x. The v1 protocol (port 1824, `getInputConfigs` / `getOutputConfig`) is no longer supported.

See **[UPGRADE.md](./UPGRADE.md)** for a full before/after migration guide.

### Added

- **Port discovery** — reads `%LOCALAPPDATA%\Packages\Elgato.WaveLink_g54w8ztgkx496\LocalState\ws-info.json` on Windows to find the port Wave Link bound to at startup. Falls back to scanning ports 1884–1893 if the file is absent (e.g. macOS).
- **`getApplicationInfo` handshake** — verifies `appID === "EWL"` before loading state; automatically skips to the next port if the wrong process is listening.
- **`WaveLinkController.getInputDevices()`** — returns `InputDevice[]` (physical hardware + virtual devices), each containing `Input[]` with per-input `gain`, `micPcMix`, `effects`, and `dspEffects`.
- **`WaveLinkController.getWaveInputDevices()`** — filtered view of `getInputDevices()` returning only physical Wave microphones (`isWaveDevice === true`).
- **`WaveLinkController.getChannels()`** — returns `Channel[]`, the software mixer channels that replace the old per-input local/stream split.
- **`WaveLinkController.getMixes()`** — returns `Mix[]`; replaces the hardcoded `localMixer` / `streamMixer` pair with N named mixes.
- **`WaveLinkController.getOutputDevices()`** — returns `OutputDevice[]`, each with `Output[]` and a `mixId` assignment.
- **`WaveLinkController.getMainOutput()`** — returns `{ outputDeviceId, outputId }`.
- **`WaveLinkController.setInputDevice(payload)`** — mutate input gain, micPcMix, mute, and effects.
- **`WaveLinkController.setOutputDevice(payload)`** — modify output level/mute or change the main output selection.
- **`WaveLinkController.setChannel(payload)`** — set master level, mute, per-mix send levels, and effects on a channel.
- **`WaveLinkController.setMix(payload)`** — set mix level and mute.
- **`WaveLinkController.addToChannel(appId, channelId)`** — route the focused app to a channel.
- **`WaveLinkController.subscribeLevelMeter(type, id)`** / **`unsubscribeLevelMeter`** — opt-in push updates for VU meters.
- **`WaveLinkController.subscribeFocusedApp()`** / **`unsubscribeFocusedApp()`** — opt-in push updates for the OS-focused application.
- **`WaveLinkController.isConnected()`** — synchronous connection state check.
- **`WaveLinkController.disconnect()`** — cleanly close the WebSocket.
- New events: `inputDevicesChanged`, `inputDeviceChanged`, `outputDevicesChanged`, `outputDeviceChanged`, `channelsChanged`, `channelChanged`, `mixesChanged`, `mixChanged`, `levelMeterChanged`, `focusedAppChanged`, `disconnected`.
- New example scripts: `channel-volume`, `level-meters`, `focused-app`, `wave-gain`.
- All v3 types exported from the package root: `InputDevice`, `Input`, `OutputDevice`, `Output`, `Channel`, `ChannelMix`, `Mix`, `Effect`, `LevelMeter`, `LevelMeters`, `MainOutput`, `FocusedApp`, and all payload / event types.

### Changed

- `connect()` is now synchronous (returns `void`); listen to the `ready` event instead of awaiting the call.
- `new WaveLinkController()` no longer accepts a `host` parameter; the host is always `127.0.0.1` and the port is auto-discovered.
- `websocketClose` event renamed to `disconnected`.
- The `events` and `simple-jsonrpc-js` runtime dependencies have been removed; JSON-RPC request/response tracking is now inlined and the Node.js built-in `EventEmitter` is used directly via the `events` module already available in Node.
- WebSocket connections now send `Origin: streamdeck://` — Wave Link 3.x enforces this header and returns 401 without it.

### Removed

- `WaveLinkInputController` — no per-input controller objects in v3. Use `WaveLinkController.getChannels()` and `setChannel()` instead.
- `WaveLinkOutputController` — use `WaveLinkController.getMixes()` and `setMix()` instead.
- `WaveLinkFilterController` — effects are plain `{ id, isEnabled }` objects; toggle them via `setChannel({ effects: [...] })`.
- `getOutput()`, `getInputs()`, `getInput({ name?, identifier? })` — replaced by `getOutputDevices()`, `getInputDevices()`, `getChannels()`, and their `*ById` variants.
- `websocketOpen` event — use the `ready` event instead.
- `filterBypassStateChanged` event — no per-bypass concept in v3.
- `inputsChanged` event — replaced by `channelsChanged`.

---

## [1.0.14] — prior

Supports Wave Link 1.x only. See git history for details.
