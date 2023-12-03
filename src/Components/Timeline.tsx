import dayjs from 'dayjs';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';
import { Bar, TimelineStore } from './stores/timelineStore';

export interface TimelineProps {
    timeline: TimelineStore;
    dvrStore: DvrStore;
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { dvrStore, timeline } = props;
    const timelineRef = useRef<HTMLDivElement>(null!);
    const liveBarRef = useRef<HTMLDivElement>(null);

    const recordings: Bar[] = [];

    useEffect(
        action(function init() {
            timeline.viewportWidthInPx = timelineRef.current.offsetWidth;
            timeline.viewportSizeInSec = 10;

            timeline.markerSizeInSec = 2;

            liveBarRef.current?.scrollIntoView({ block: 'end', inline: 'end' });
        }),
        []
    );

    function getTimelineOffsetForRecording({ startTime, duration }: Bar) {
        const startTimeOffset = dayjs.duration(startTime.diff(timeline.startOfTimeline));

        return {
            left: timeline.getAsPixelOffset(startTimeOffset),
            width: timeline.getAsPixelOffset(duration),
        };
    }

    function getThumb() {
        const thumbOffset = dayjs.duration(
            timeline.liveRecordingCurrentTime.diff(timeline.startOfTimeline)
        );

        const style: React.CSSProperties = {
            left: `${timeline.getAsPixelOffset(thumbOffset)}px`,
        };

        return (
            <div className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getBars() {
        return recordings.map((recording, i) => {
            const offset = getTimelineOffsetForRecording(recording);

            const style: React.CSSProperties = {
                left: `${offset.left}px`,
                width: `${offset.width}px`,
            };

            const isLiveBar = dvrStore.isLive && i === recordings.length - 1;

            return (
                <div
                    key={i}
                    className={isLiveBar ? `bar live` : `bar`}
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
            width: `${timeline.getAsPixelOffset(timeline.markerDuration)}px`,
        };

        while (currTime.isBefore(endTime) || currTime.isSame(endTime)) {
            elts.push(
                <div key={elts.length} className="marker" style={style}>
                    <span>{currTime.format('h:mm:ss')}</span>
                </div>
            );

            currTime = currTime.add(timeline.markerDuration);
        }

        return elts;
    }

    function onMouseMove(ev: React.MouseEvent<HTMLDivElement>) {
        const elt = ev.currentTarget;
        const rect = elt.getBoundingClientRect();
        const x = ev.clientX + elt.scrollLeft - rect.x;
        const seconds = timeline.getAsTimelineSeconds(x);

        timeline.setCurrentTimeBySeconds(seconds);
    }

    return (
        <div className="timeline" ref={timelineRef} onMouseMove={action((ev) => onMouseMove(ev))}>
            {getBars()}
            {getTimeMarkers()}
            {getThumb()}
        </div>
    );
});
