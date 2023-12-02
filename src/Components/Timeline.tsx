import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React from 'react';

dayjs.extend(duration);

export interface TimelineProps {
    onSnapToTime: () => void;
}

interface Bar {
    startTime: Dayjs;
    durationInMin: number;
}

const today = dayjs().startOf('day');

const sliceWidthInPx = 100;

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const recordings: Bar[] = [
        {
            startTime: today.add(12, 'hours'),
            durationInMin: dayjs.duration({ minutes: 60 }).asMinutes(),
        },
        {
            startTime: today.add(15, 'hours'),
            durationInMin: dayjs.duration({ minutes: 18 }).asMinutes(),
        },
        {
            startTime: today.add(18, 'hours'),
            durationInMin: dayjs.duration({ minutes: 36 }).asMinutes(),
        },
    ];

    const slices = getSlices(recordings);
    const bars = getBars(recordings);

    return (
        <div className="timeline">
            {bars}
            {slices}
        </div>
    );
});

function getBars(bars: Bar[]) {
    const shift = 0; // bars[0].startTime.diff(today, 'minutes');

    return bars.map(({ startTime, durationInMin }, i) => {
        const startTimeInMin = startTime.diff(today, 'minutes') - shift;
        const style: React.CSSProperties = {
            left: `${(startTimeInMin / 15) * sliceWidthInPx}px`,
            width: `${(durationInMin / 15) * sliceWidthInPx}px`,
        };

        return <div key={i} className="bar" style={style} />;
    });
}

function getSlices(bars: Bar[]) {
    const elts: React.JSX.Element[] = [];

    // const lastBar = bars[bars.length - 1];
    // const stopTime = lastBar.startTime.add(
    //     lastBar.durationInMin + (15 - (lastBar.durationInMin % 15)),
    //     'minutes'
    // );

    const stopTime = bars[0].startTime.endOf('day');

    let currTime = bars[0].startTime.startOf('day');

    while (currTime.isBefore(stopTime)) {
        elts.push(
            <div key={elts.length} className="slice">
                <span>{currTime.format('h:mma')}</span>
            </div>
        );

        currTime = currTime.add(15, 'minutes');
    }

    return elts;
}
