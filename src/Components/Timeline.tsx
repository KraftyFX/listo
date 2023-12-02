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
const sliceSizeInMin = 15;
const minuteSizeInPx = 10;

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
    const startOfTimeline = getSliceStartTimeBefore(firstRecording.startTime);

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
            .add(sliceSizeInMin * Math.floor(time.minute() / sliceSizeInMin), 'minutes');
    }

    function getThumb(thumbTime: Dayjs) {
        const thumbTimeInMin = getTimelineMinutes(thumbTime);

        const style: React.CSSProperties = {
            left: `${getTimelineMinutesAsPixels(thumbTimeInMin)}px`,
        };

        return (
            <div className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getTimelineMinutes(time: dayjs.Dayjs) {
        const timelineStartInSec = startOfTimeline.diff(startOfDay, 'seconds');
        const seconds = time.diff(startOfDay, 'seconds') - timelineStartInSec;
        const minutes = seconds / 60;

        return minutes;
    }

    function getTimelineMinutesAsPixels(timelineMinutes: number) {
        return timelineMinutes * minuteSizeInPx;
    }

    function getBars() {
        return recordings.map(({ startTime, durationInMin }, i) => {
            const startTimeInMin = getTimelineMinutes(startTime);

            const style: React.CSSProperties = {
                left: `${getTimelineMinutesAsPixels(startTimeInMin)}px`,
                width: `${getTimelineMinutesAsPixels(durationInMin)}px`,
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

        let currTime = startOfTimeline;
        const endTime = lastRecording.startTime.add(lastRecording.durationInMin, 'minutes');

        const style: React.CSSProperties = { width: `${sliceSizeInMin * minuteSizeInPx}px` };

        while (currTime.isBefore(endTime)) {
            elts.push(
                <div key={elts.length} className="slice" style={style}>
                    <span>{currTime.format('h:mma')}</span>
                </div>
            );

            currTime = currTime.add(sliceSizeInMin, 'minutes');
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
