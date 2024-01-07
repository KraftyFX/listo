import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { getPlayTime } from './formatutil';

export type PlaybackCommands =
    | 'rewind'
    | 'play'
    | 'pause'
    | 'fastForward'
    | 'slowForward'
    | 'nextFrame';

export interface PlaybackControlsProps {
    dvrStore: DvrStore;
}

export const PlaybackControls = observer(function PlaybackControls(props: PlaybackControlsProps) {
    const { dvrStore } = props;
    const { currentTime, speed } = dvrStore;

    const onCommand = action((command: PlaybackCommands) => {
        switch (command) {
            case 'rewind':
                dvrStore.dvr.rewind();
                break;
            case 'play':
                dvrStore.dvr.play();
                break;
            case 'pause':
                dvrStore.dvr.pause();
                break;
            case 'fastForward':
                dvrStore.dvr.fastForward();
                break;
            case 'slowForward':
                dvrStore.dvr.slowForward();
                break;
            case 'nextFrame':
                dvrStore.dvr.nextFrame();
                break;
        }
    });

    const handleGoLive = action(() => {
        dvrStore.dvr.switchToLiveStream();
    });

    return (
        <div className="section">
            <button
                id="rewind"
                disabled={dvrStore.isRewindDisabled}
                onClick={() => onCommand?.('rewind')}>
                Rewind
            </button>
            {dvrStore.isPaused ? (
                <button
                    id="play"
                    disabled={dvrStore.isPlayDisabled}
                    onClick={() => onCommand?.('play')}>
                    Play
                </button>
            ) : null}
            {!dvrStore.isPaused ? (
                <button id="pause" onClick={() => onCommand?.('pause')}>
                    Pause
                </button>
            ) : null}
            <button
                id="nextFrame"
                disabled={dvrStore.isNextFrameDisabled}
                onClick={() => onCommand?.('nextFrame')}>
                Next Frame
            </button>
            <button
                id="slowForward"
                disabled={dvrStore.isSlowForwardDisabled}
                onClick={() => onCommand?.('slowForward')}>
                Slow Forward
            </button>
            <button
                id="fastForward"
                disabled={dvrStore.isFastForwardDisabled}
                onClick={() => onCommand?.('fastForward')}>
                Fast Forward
            </button>
            <button id="live" disabled={dvrStore.isLive} onClick={handleGoLive}>
                Live
            </button>
            <div>
                <span className="elapsed">{getPlayTime(currentTime, speed)}</span>
            </div>
        </div>
    );
});
