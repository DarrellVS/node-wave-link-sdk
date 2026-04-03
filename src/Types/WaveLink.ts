// ---------------------------------------------------------------------------
// Core data types — shapes returned by Wave Link v3
// ---------------------------------------------------------------------------

export type ApplicationInfo = {
  appID: string;           // "EWL" for Wave Link
  interfaceRevision: number; // must be >= 1
};

export type Effect = {
  id: string;
  isEnabled: boolean;
};

export type Input = {
  id: string;
  name?: string;
  isMuted: boolean;
  gain: { value: number };      // hardware gain in dB; range depends on device
  micPcMix: { value: number };  // 0–1 blend between mic and PC audio
  dspEffects: Effect[];
  effects: Effect[];
};

export type InputDevice = {
  id: string;
  name: string;
  isWaveDevice: boolean;        // true if this is a physical Wave microphone
  inputs: Input[];
};

export type Output = {
  id: string;
  name: string;
  isMuted: boolean;
  level: number;    // 0–1
  mixId: string;    // ID of the Mix this output is assigned to
};

export type OutputDevice = {
  id: string;
  name: string;
  isWaveDevice: boolean;
  outputs: Output[];
};

export type MainOutput = {
  outputDeviceId: string;
  outputId?: string;   // absent when the device has only one output
};

export type ChannelMix = {
  id: string;         // Mix ID
  isMuted: boolean;
  level: number;      // 0–1 send level from this channel to this mix
};

export type Channel = {
  id: string;
  name: string;
  type: string;       // e.g. "system", "game", "voice", etc.
  isMuted: boolean;
  level: number;      // 0–1 master channel fader
  mixes: ChannelMix[];
  effects: Effect[];
  apps?: { id: string; name?: string }[]; // apps routed to this channel
};

export type Mix = {
  id: string;
  name: string;
  isMuted: boolean;
  level: number;      // 0–1
  image?: { name: string };
};

export type LevelMeter = {
  id: string;
  subId?: string;
  levelLeftPercentage: number;   // 0–100
  levelRightPercentage: number;  // 0–100
};

export type LevelMeters = {
  inputDevices: LevelMeter[];
  outputDevices: LevelMeter[];
  channels: LevelMeter[];
  mixes: LevelMeter[];
};

export type FocusedApp = {
  id: string;
  name: string;
  channel: { id: string };
};

// ---------------------------------------------------------------------------
// Subscription types — for levelMeterChanged and focusedAppChanged
// ---------------------------------------------------------------------------

export type SubscriptionType = 'input' | 'output' | 'channel' | 'mix';

export type SubscriptionPayload = {
  isEnabled: boolean;
  type?: SubscriptionType;
  id?: string;
  subId?: string;
};

// ---------------------------------------------------------------------------
// Event maps — typed event signatures for WaveLinkController
// ---------------------------------------------------------------------------

export type WaveLinkControllerEvents = {
  // Lifecycle
  ready: () => void;
  disconnected: () => void;

  // Input devices
  inputDevicesChanged: () => void;
  inputDeviceChanged: (id: string) => void;

  // Output devices
  outputDevicesChanged: () => void;
  outputDeviceChanged: (id: string) => void;
  mainOutputDeviceChanged: (mainOutput: MainOutput) => void;

  // Software channels
  channelsChanged: () => void;
  channelChanged: (id: string, mixIds: string[], changedProperties: string[]) => void;

  // Mixes
  mixesChanged: () => void;
  mixChanged: (id: string) => void;

  // Level meters (opt-in via subscribeLevelMeter)
  levelMeterChanged: () => void;

  // Focused app (opt-in via subscribeFocusedApp)
  focusedAppChanged: (app: FocusedApp) => void;
};

// ---------------------------------------------------------------------------
// Payload types for setXxx methods
// ---------------------------------------------------------------------------

/**
 * setInputDevice payload.
 * Wrap changes inside inputs[]. Only provide the fields you want to change.
 */
export type SetInputDevicePayload = {
  id: string;
  inputs: Array<{
    id: string;
    isMuted?: boolean;
    gain?: { value: number };
    micPcMix?: { value: number };
    effects?: Array<{ id: string; isEnabled: boolean }>;
    dspEffects?: Array<{ id: string; isEnabled: boolean }>;
  }>;
};

/**
 * setOutputDevice has two overloaded forms:
 * 1. Modify outputs on a device (level, mute, mixId assignment)
 * 2. Set the main output
 */
export type SetOutputDevicePayload =
  | {
      outputDevice: {
        id: string;
        outputs: Array<{
          id: string;
          isMuted?: boolean;
          level?: number;     // 0–1
          mixId?: string;
        }>;
      };
    }
  | {
      mainOutput: MainOutput;
    };

/**
 * setChannel payload.
 * All fields except id are optional — only send what you want to change.
 */
export type SetChannelPayload = {
  id: string;
  level?: number;    // 0–1 master fader
  isMuted?: boolean;
  mixes?: Array<{
    id: string;
    level?: number;  // 0–1 send level
    isMuted?: boolean;
  }>;
  effects?: Array<{ id: string; isEnabled: boolean }>;
};

/**
 * setMix payload.
 */
export type SetMixPayload = {
  id: string;
  level?: number;    // 0–1
  isMuted?: boolean;
};

/**
 * addToChannel payload — route a focused app to a channel.
 */
export type AddToChannelPayload = {
  appId: string;
  channelId: string;
};

/**
 * setSubscription payload.
 * Keys must match notification event names exactly.
 */
export type SetSubscriptionPayload = {
  focusedAppChanged?: SubscriptionPayload;
  levelMeterChanged?: SubscriptionPayload;
};
