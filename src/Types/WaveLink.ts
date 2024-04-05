export type MixerType =
  | 'com.elgato.mix.stream'
  | 'com.elgato.mix.local'
  | 'com.elgato.mix.microphoneFX';

export type GetOutputsResponse = {
  outputs: {
    identifier: string;
    name: string;
  }[];
  selectedOutput: string;
};

export type GetOutputConfigResponse = {
  localMixer: [boolean, number];
  streamMixer: [boolean, number];
};

export type GetInputConfigFilter = {
  filterID: string;
  isActive: boolean;
  name: string;
  pluginID: string;
};

export type GetInputConfig = {
  bgColor: string;
  filters?: GetInputConfigFilter[];
  iconData: string;
  identifier: string;
  inputType: number;
  isAvailable: boolean;
  // muted - volume - effects muted
  localMixer: [boolean, number, boolean];
  name: string;
  // muted - volume - effects muted
  streamMixer: [boolean, number, boolean];
};

export type GetInputConfigsResponse = GetInputConfig[];

export type WaveLinkEvents = {
  websocketOpen: () => void;
  initialiseChannels: (dto: {
    inputs: GetInputConfigsResponse;
    outputs: GetOutputConfigResponse;
    selectedOutput: GetOutputsResponse['selectedOutput'];
  }) => void;
  outputMuteChanged: (dto: { mixerID: MixerType; value: boolean }) => void;
  outputVolumeChanged: (dto: { mixerID: MixerType; value: number }) => void;
  selectedOutputChanged: (value: string) => void;
  inputNameChanged: (dto: { identifier: string; value: string }) => void;
  inputMuteChanged: (dto: {
    identifier: string;
    mixerID: MixerType;
    value: boolean;
  }) => void;
  inputVolumeChanged: (dto: {
    identifier: string;
    mixerID: MixerType;
    value: number;
  }) => void;
  filterBypassStateChanged: (dto: {
    identifier: string;
    mixerID: MixerType;
    value: boolean;
  }) => void;
  filterAdded: (dto: {
    identifier: string;
    filter: GetInputConfigFilter;
  }) => void;
  filterRemoved: (dto: { filterID: string; identifier: string }) => void;
  filterChanged: (dto: {
    filterID: string;
    identifier: string;
    value: boolean;
  }) => void;
  inputsChanged: (inputs: GetInputConfigsResponse) => void;
};

export type VolumeAndMuteChangedEvent = {
  localVolume: number;
  streamVolume: number;
  localMute: boolean;
  streamMute: boolean;
};

export type WaveLinkChannelEvents = {
  localVolumeChanged: (volume: number) => void;
  streamVolumeChanged: (volume: number) => void;
  volumeChanged: (dto: VolumeAndMuteChangedEvent) => void;
  localMuteChanged: (isMuted: boolean) => void;
  streamMuteChanged: (isMuted: boolean) => void;
  muteChanged: (dto: VolumeAndMuteChangedEvent) => void;
};

export type WaveLinkOutputChannelEvents = WaveLinkChannelEvents & {
  selectedOutputChanged: (identifier: string) => void;
};

export type WaveLinkInputChannelEvents = WaveLinkChannelEvents & {
  streamFiltersMuteChanged: (isMuted: boolean) => void;
  localFiltersMuteChanged: (isMuted: boolean) => void;
};
