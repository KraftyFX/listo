import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { formatSeconds } from '~/media/dateutil';
import { DvrStore } from '~/media/dvrStore';

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
    const { currentTime, duration, speed } = dvrStore;
    const parts = [];

    if (currentTime === duration) {
        parts.push(formatSeconds(currentTime));
    } else {
        parts.push(formatSeconds(currentTime) + ' / ' + formatSeconds(duration));
    }

    if (speed !== 1 && speed !== 0) {
        parts.push('@ ' + speed + 'x');
    }

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
            {!dvrStore.isLive ? (
                <button
                    id="nextFrame"
                    disabled={dvrStore.isNextFrameDisabled}
                    onClick={() => onCommand?.('nextFrame')}>
                    Next Frame
                </button>
            ) : null}
            {!dvrStore.isLive ? (
                <button
                    id="slowForward"
                    disabled={dvrStore.isSlowForwardDisabled}
                    onClick={() => onCommand?.('slowForward')}>
                    Slow Forward
                </button>
            ) : null}
            {!dvrStore.isLive ? (
                <button
                    id="fastForward"
                    disabled={dvrStore.isFastForwardDisabled}
                    onClick={() => onCommand?.('fastForward')}>
                    Fast Forward
                </button>
            ) : null}
            <span className="elapsed">{parts.join(' ')}</span>
        </div>
    );
});
