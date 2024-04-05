const mixerIDSelectedOutputAndValueTransformer = ({
  mixerID,
  value,
  selectedOutput,
}) => ({
  mixerID,
  value,
  selectedOutput,
});

const identifierAndFilterIDTransformer = ({ identifier, filterID }) => ({
  identifier,
  filterID,
});

const identifierAndFilterTransformer = ({ identifier, filter }) => ({
  identifier,
  filter,
});

const identifierMixerIDAndValueTransformer = ({
  identifier,
  mixerID,
  value,
}) => ({
  identifier,
  mixerID,
  value,
});

const identifierFilterIDAndValueTransformer = ({
  identifier,
  filterID,
  value,
}) => ({
  identifier,
  filterID,
  value,
});

const WaveLinkEventMap = {
  outputMuteChanged: mixerIDSelectedOutputAndValueTransformer,
  outputVolumeChanged: mixerIDSelectedOutputAndValueTransformer,
  inputNameChanged: identifierMixerIDAndValueTransformer,
  inputMuteChanged: identifierMixerIDAndValueTransformer,
  inputVolumeChanged: identifierMixerIDAndValueTransformer,
  filterBypassStateChanged: identifierMixerIDAndValueTransformer,
  filterAdded: identifierAndFilterTransformer,
  filterRemoved: identifierAndFilterIDTransformer,
  filterChanged: identifierFilterIDAndValueTransformer,
};

export const getWaveLinkEventData = (
  method: string,
  params: {
    identifier: string;
    mixerID: string;
    value: boolean;
  },
  selectedOutput: string
) => {
  if (WaveLinkEventMap[method]) {
    return WaveLinkEventMap[method]({
      ...params,
      selectedOutput,
    });
  }
  return null;
};