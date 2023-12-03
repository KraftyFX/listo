import dayjs from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';
import { TimelineStore } from './stores/timelineStore';

export interface TimelineProps {
    timeline: TimelineStore;
    viewportDuration: Duration;
    dvrStore: DvrStore;
    onSnapToTime: () => void;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { dvrStore, timeline, viewportDuration } = props;
    const [width, setWidth] = useState(1);

    const timelineRef = useRef<HTMLDivElement>(null!);
    const thumbRef = useRef<HTMLDivElement>(null);

    useEffect(
        action(function init() {
            setWidth(timelineRef.current.offsetWidth);

            timeline.markerSizeInSec = 2;
        }),
        []
    );

    function getAsPixelOffset(duration: Duration) {
        const pixelsPerSec = width / viewportDuration.asSeconds();
        return duration.asSeconds() * pixelsPerSec;
    }

    function getAsTimelineSeconds(x: number) {
        const secPerPixel = viewportDuration.asSeconds() / width;
        return x * secPerPixel;
    }

    function getThumb() {
        const thumbOffset = dayjs.duration(
            timeline.liveRecordingCurrentTime.diff(timeline.startOfTimeline)
        );

        const style: React.CSSProperties = {
            left: `${getAsPixelOffset(thumbOffset)}px`,
        };

        return (
            <div ref={thumbRef} className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getBars() {
        return timeline.allRecordings.map(({ startTime, duration }, i, recordings) => {
            const startTimeOffset = dayjs.duration(startTime.diff(timeline.startOfTimeline));

            const style: React.CSSProperties = {
                left: `${getAsPixelOffset(startTimeOffset)}px`,
                width: `${getAsPixelOffset(duration)}px`,
            };

            const isLiveBar = dvrStore.isLive && i === recordings.length - 1;

            return <div key={i} className={isLiveBar ? `bar live` : `bar`} style={style} />;
        });
    }

    function getTimeMarkers() {
        const elts: React.JSX.Element[] = [];

        let currTime = timeline.startOfTimeline;
        const endTime = timeline.endOfTimeline;

        const style: React.CSSProperties = {
            width: `${getAsPixelOffset(timeline.markerDuration)}px`,
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

    const onMouseMove = action((ev: React.MouseEvent<HTMLDivElement>) => {
        const elt = ev.currentTarget;
        const rect = elt.getBoundingClientRect();
        const xWithScrollbar = ev.clientX + elt.scrollLeft - rect.x;
        const seconds = getAsTimelineSeconds(xWithScrollbar);

        timeline.setCurrentTimeBySeconds(seconds);
    });

    return (
        <div ref={timelineRef} className="timeline" onMouseMove={onMouseMove}>
            {getBars()}
            {getTimeMarkers()}
            {getThumb()}
        </div>
    );
});
