import React from 'react';

export type LiveStreamCommands = 'rewind' | 'play';

export interface LiveStreamControsProps {
    onCommand?: (command: LiveStreamCommands) => void;
}

export function LiveStreamControls(props: LiveStreamControsProps) {
    return (
        <div className="section">
            <button id="rewind" onClick={() => props.onCommand?.('rewind')}>
                Rewind
            </button>
            <button id="play" onClick={() => props.onCommand?.('play')}>
                Play
            </button>
        </div>
    );
}
