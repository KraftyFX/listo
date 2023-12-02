import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { DvrStore } from '~/media/dvrStore';

dayjs.extend(duration);

export interface TimelineProps {
    dvrStore: DvrStore;
    onSnapToTime: () => void;
}

interface Bar {
    startTime: Dayjs;
    durationInMin: number;
}

const multiplierToMakeTestingEasier = 30;
const sliceTimeInMin = 15;
const sliceWidthInPx = 300;

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { dvrStore } = props;
    const liveBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        liveBarRef.current?.scrollIntoView({ block: 'end', inline: 'end' });
    }, []);

    const recordings: Bar[] = [];

    recordings.push({
        startTime: dayjs().subtract(15, 'minutes'),
        durationInMin: dayjs.duration({ minutes: 10 }).asMinutes(),
    });

    if (dvrStore.isLive) {
        recordings.push(getLiveRecordingBar());
    }

    const firstRecording = recordings[0];
    const lastRecording = recordings[recordings.length - 1];

    const startOfDay = firstRecording.startTime.startOf('day');
    const startOfFirstSlice = getSliceStartTimeBefore(firstRecording.startTime);
    const firstSliceOffsetInSec = startOfFirstSlice.diff(startOfDay, 'seconds');

    const slices = getSlices();
    const bars = getBars();
    const thumb = getThumb(getThumbTime());

    function getLiveRecordingBar(): Bar {
        return {
            startTime: dvrStore.recordingStartTime,
            durationInMin: dayjs
                .duration({ seconds: dvrStore.duration * multiplierToMakeTestingEasier })
                .asMinutes(),
        };
    }

    function getThumbTime(): dayjs.Dayjs {
        return dvrStore.recordingStartTime.add(
            dvrStore.currentTime * multiplierToMakeTestingEasier,
            'seconds'
        );
    }

    function getSliceStartTimeBefore(time: Dayjs) {
        return time
            .startOf('hour')
            .add(sliceTimeInMin * Math.floor(time.minute() / sliceTimeInMin), 'minutes');
    }

    function getThumb(thumbTime: Dayjs) {
        const thumbTimeInSec = thumbTime.diff(startOfDay, 'seconds') - firstSliceOffsetInSec;
        const thumbTimeInMin = thumbTimeInSec / 60;

        const style: React.CSSProperties = {
            left: `${(thumbTimeInMin / sliceTimeInMin) * sliceWidthInPx}px`,
        };

        return (
            <div className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getBars() {
        return recordings.map(({ startTime, durationInMin }, i) => {
            const startTimeInSec = startTime.diff(startOfDay, 'seconds') - firstSliceOffsetInSec;
            const startTimeInMin = startTimeInSec / 60;

            const style: React.CSSProperties = {
                left: `${(startTimeInMin / sliceTimeInMin) * sliceWidthInPx}px`,
                width: `${(durationInMin / sliceTimeInMin) * sliceWidthInPx}px`,
            };

            const classNames = ['bar'];
            const isLiveBar = dvrStore.isLive && i === recordings.length - 1;

            if (isLiveBar) {
                classNames.push('live');
            }

            return (
                <div
                    key={i}
                    className={classNames.join(' ')}
                    ref={isLiveBar ? liveBarRef : null}
                    style={style}
                />
            );
        });
    }

    function getSlices() {
        const elts: React.JSX.Element[] = [];

        let currTime = startOfFirstSlice;
        const endTime = lastRecording.startTime.add(lastRecording.durationInMin, 'minutes');

        const style: React.CSSProperties = { width: `${sliceWidthInPx}px` };

        while (currTime.isBefore(endTime)) {
            elts.push(
                <div key={elts.length} className="slice" style={style}>
                    <span>{currTime.format('h:mma')}</span>
                </div>
            );

            currTime = currTime.add(sliceTimeInMin, 'minutes');
        }

        return elts;
    }

    return (
        <div className="timeline">
            {bars}
            {slices}
            {thumb}
        </div>
    );
});
