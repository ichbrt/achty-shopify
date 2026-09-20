import React from 'react';
import {Composition} from 'remotion';
import {ACHTyVideo} from './Video';
import {TOTAL_FRAMES} from './generated';

export const Root: React.FC = () => {
  return (
    <Composition
      id="ACHTyPremium"
      component={ACHTyVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
