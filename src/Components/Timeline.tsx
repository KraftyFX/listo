import { observer } from 'mobx-react';
import React from 'react';

export interface TimelineProps {
    onGoLive: () => void;
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    return (
        <div className="section">
            <button id="mid" onClick={props.onSnapToTime}>
                Goto middle
            </button>
            <button id="live" onClick={props.onGoLive}>
                Live
            </button>
        </div>
    );
});
