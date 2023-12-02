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

class TimelineHelper {
    private readonly multiplierToMakeTestingEasier = 30;
    public readonly sliceSizeInMin = 15;
    private readonly minuteSizeInPx = 10;

    constructor(public readonly dvrStore: DvrStore, public readonly recordings: Bar[]) {}

    private get firstRecording() {
        return this.recordings[0];
    }

    private get lastRecording() {
        return this.recordings[this.recordings.length - 1];
    }

    get liveRecording() {
        return {
            startTime: this.dvrStore.recordingStartTime,
            durationInMin: dayjs
                .duration({ seconds: this.dvrStore.duration * this.multiplierToMakeTestingEasier })
                .asMinutes(),
        };
    }

    get currentTime() {
        return this.dvrStore.recordingStartTime.add(
            this.dvrStore.currentTime * this.multiplierToMakeTestingEasier,
            'seconds'
        );
    }

    get startOfTimeline() {
        const startOfTimeline = this.getSliceBefore(this.firstRecording.startTime);

        return startOfTimeline;
    }

    get endOfTimeline() {
        const { startTime, durationInMin } = this.lastRecording;
        const endOfTimeline = startTime.add(
            this.sliceSizeInMin - (durationInMin % this.sliceSizeInMin),
            'minutes'
        );

        return endOfTimeline;
    }

    private getSliceBefore(time: Dayjs) {
        return time
            .startOf('hour')
            .add(this.sliceSizeInMin * Math.floor(time.minute() / this.sliceSizeInMin), 'minutes');
    }

    getTimelineMinutes(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const timelineStartInSec = this.startOfTimeline.diff(startOfDay, 'seconds');
        const seconds = time.diff(startOfDay, 'seconds') - timelineStartInSec;
        const minutes = seconds / 60;

        return minutes;
    }

    getAsPixels(timelineMinutes: number) {
        return timelineMinutes * this.minuteSizeInPx;
    }
}

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

    const timeline = new TimelineHelper(dvrStore, recordings);

    if (dvrStore.isLive) {
        recordings.push(timeline.liveRecording);
    }

    function getThumb() {
        const thumbTimeInMin = timeline.getTimelineMinutes(timeline.currentTime);

        const style: React.CSSProperties = {
            left: `${timeline.getAsPixels(thumbTimeInMin)}px`,
        };

        return (
            <div className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getBars() {
        return recordings.map(({ startTime, durationInMin }, i) => {
            const startTimeInMin = timeline.getTimelineMinutes(startTime);

            const style: React.CSSProperties = {
                left: `${timeline.getAsPixels(startTimeInMin)}px`,
                width: `${timeline.getAsPixels(durationInMin)}px`,
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

        let currTime = timeline.startOfTimeline;
        const endTime = timeline.endOfTimeline;

        const style: React.CSSProperties = {
            width: `${timeline.getAsPixels(timeline.sliceSizeInMin)}px`,
        };

        while (currTime.isBefore(endTime)) {
            elts.push(
                <div key={elts.length} className="slice" style={style}>
                    <span>{currTime.format('h:mma')}</span>
                </div>
            );

            currTime = currTime.add(timeline.sliceSizeInMin, 'minutes');
        }

        return elts;
    }

    return (
        <div className="timeline">
            {getBars()}
            {getSlices()}
            {getThumb()}
        </div>
    );
});
