import React from 'react';
import { formatSeconds } from '~/media/dateutil';

export interface TimelineProps {
    currentTime: number;
    duration: number;
    multiplier: number;
}

export function Timeline({ currentTime, duration, multiplier }: TimelineProps) {
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
            <span>{parts.join(' ')}</span>
        </div>
    );
}
