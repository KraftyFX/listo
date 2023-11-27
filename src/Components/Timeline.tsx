import { observer } from 'mobx-react';
import React from 'react';

export interface TimelineProps {
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    return (
        <div className="section">
            <button id="mid" onClick={props.onSnapToTime}>
                Goto middle
            </button>
        </div>
    );
});
