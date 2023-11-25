import React from 'react';

export type PlaybackCommands =
    | 'rewind'
    | 'play'
    | 'pause'
    | 'fastForward'
    | 'slowForward'
    | 'nextFrame';

export interface PlaybackControlsProps {
    onCommand?: (command: PlaybackCommands) => void;
}

export function PlaybackControls(props: PlaybackControlsProps) {
    return (
        <div className="section">
            <button id="rewind" onClick={() => props.onCommand?.('rewind')}>
                Rewind
            </button>
            <button id="play" onClick={() => props.onCommand?.('play')}>
                Play
            </button>
            <button id="pause" onClick={() => props.onCommand?.('pause')}>
                Pause
            </button>
            <button id="fastForward" onClick={() => props.onCommand?.('fastForward')}>
                Fast Forward
            </button>
            <button id="slowForward" onClick={() => props.onCommand?.('slowForward')}>
                Slow Forward
            </button>
            <button id="nextFrame" onClick={() => props.onCommand?.('nextFrame')}>
                Next Frame
            </button>
        </div>
    );
}
