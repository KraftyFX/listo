import { observer } from 'mobx-react';
import React from 'react';
import { formatSeconds } from '~/media/dateutil';

export interface TimelineProps {
    currentTime: number;
    duration: number;
    speed: number;

    onGoLive: () => void;
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { currentTime, duration, speed } = props;
    const parts = [];

    if (currentTime === duration) {
        parts.push(formatSeconds(currentTime));
    } else {
        parts.push(formatSeconds(currentTime) + ' / ' + formatSeconds(duration));
    }

    if (speed !== 0) {
        parts.push('@ ' + speed + 'x');
    }

    return (
        <div className="section">
            <button id="mid" onClick={props.onSnapToTime}>
                Goto middle
            </button>
            <span className="elapsed">{parts.join(' ')}</span>
            <button id="live" onClick={props.onGoLive}>
                Live
            </button>
        </div>
    );
});
