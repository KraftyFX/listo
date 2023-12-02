import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';

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
    private readonly multiplierToMakeTestingEasier = 60;
    public readonly markerSizeInMin = 10;
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
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, durationInMin } = this.dvrStore.isLive
            ? this.liveRecording
            : this.lastRecording;

        const endOfRecording = startTime.add(durationInMin, 'minutes');

        return this.getPrevMarkerStartTime(endOfRecording).add(this.markerSizeInMin, 'minutes');
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const minFromPrevMarkerStart =
            this.markerSizeInMin * Math.floor(time.minute() / this.markerSizeInMin);

        return time.startOf('hour').add(minFromPrevMarkerStart, 'minutes');
    }

    getTimelineMinutesFromTime(time: dayjs.Dayjs) {
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
        // recordings.push({
        //     startTime: recordings[0].startTime.subtract(15, 'minutes'),
        //     durationInMin: dayjs.duration({ minutes: 10 }).asMinutes(),
        // });

        liveBarRef.current?.scrollIntoView({ block: 'end', inline: 'end' });
    }, []);

    const recordings: Bar[] = [];

    const timeline = new TimelineHelper(dvrStore, recordings);

    if (dvrStore.isLive) {
        recordings.push(timeline.liveRecording);
    }

    function getThumb() {
        const thumbTimeInMin = timeline.getTimelineMinutesFromTime(timeline.currentTime);

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
            const startTimeInMin = timeline.getTimelineMinutesFromTime(startTime);

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

    function getTimeMarkers() {
        const elts: React.JSX.Element[] = [];

        let currTime = timeline.startOfTimeline;
        const endTime = timeline.endOfTimeline;

        const style: React.CSSProperties = {
            width: `${timeline.getAsPixels(timeline.markerSizeInMin)}px`,
        };

        while (currTime.isBefore(endTime) || currTime.isSame(endTime)) {
            elts.push(
                <div key={elts.length} className="marker" style={style}>
                    <span>{currTime.format('h:mm')}</span>
                </div>
            );

            currTime = currTime.add(timeline.markerSizeInMin, 'minutes');
        }

        return elts;
    }

    return (
        <div className="timeline">
            {getBars()}
            {getTimeMarkers()}
            {getThumb()}
        </div>
    );
});
