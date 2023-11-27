import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
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
            <button id="rewind" onClick={() => onCommand?.('rewind')}>
                Rewind
            </button>
            {dvrStore.isPaused ? (
                <button id="play" onClick={() => onCommand?.('play')}>
                    Play
                </button>
            ) : null}
            {!dvrStore.isPaused ? (
                <button id="pause" onClick={() => onCommand?.('pause')}>
                    Pause
                </button>
            ) : null}
            {!dvrStore.isLive ? (
                <button id="nextFrame" onClick={() => onCommand?.('nextFrame')}>
                    Next Frame
                </button>
            ) : null}
            {!dvrStore.isLive ? (
                <button id="slowForward" onClick={() => onCommand?.('slowForward')}>
                    Slow Forward
                </button>
            ) : null}
            {!dvrStore.isLive ? (
                <button id="fastForward" onClick={() => onCommand?.('fastForward')}>
                    Fast Forward
                </button>
            ) : null}
        </div>
    );
});
