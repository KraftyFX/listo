import React from 'react';
import { formatSeconds } from '~/media/dateutil';

export interface TimelineProps {
    currentTime: number;
    duration: number;
    multiplier: number;

    onGoLive: () => void;
    onSnapToTime: () => void;
}

export function Timeline(props: TimelineProps) {
    const { currentTime, duration, multiplier } = props;
    const parts = [];

    if (currentTime === duration) {
        parts.push(formatSeconds(currentTime));
    } else {
        parts.push(formatSeconds(currentTime) + ' / ' + formatSeconds(duration));
    }

    if (multiplier !== 0) {
        parts.push('@ ' + multiplier + 'x');
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
}
