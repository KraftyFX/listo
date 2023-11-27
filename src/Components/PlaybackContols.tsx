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
    onCommand?: (command: PlaybackCommands) => void;
}

export const PlaybackControls = observer(function PlaybackControls(props: PlaybackControlsProps) {
    const { dvrStore, onCommand } = props;

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
