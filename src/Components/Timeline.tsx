import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';
import { Bar, TimelineStore } from './stores/timelineStore';

dayjs.extend(duration);

export interface TimelineProps {
    dvrStore: DvrStore;
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { dvrStore } = props;
    const liveBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        liveBarRef.current?.scrollIntoView({ block: 'end', inline: 'end' });
    }, []);

    const recordings: Bar[] = [];

    const timeline = new TimelineStore(dvrStore, recordings);

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
