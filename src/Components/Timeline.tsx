import dayjs, { Dayjs } from 'dayjs';
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
        }),
        []
    );

    function getPixelsFromTime(time: Dayjs) {
        const duration = dayjs.duration(time.diff(timeline.startOfTimeline));

        return getPixelsFromDuration(duration);
    }

    function getPixelsFromDuration(duration: Duration) {
        const pixelsPerSec = width / (viewportDuration.asMilliseconds() / 1000);
        const pixels = (duration.asMilliseconds() / 1000) * pixelsPerSec;

        return pixels;
    }

    function getTimeFromPixels(x: number) {
        const secPerPixel = viewportDuration.asSeconds() / width;
        const ms = dayjs.duration({ seconds: x * secPerPixel }).asMilliseconds();
        const time = timeline.startOfTimeline.add(ms, 'milliseconds');

        return time;
    }

    function getThumb() {
        const thumbOffset = timeline.currentTime;

        const style: React.CSSProperties = {
            left: `${getPixelsFromTime(thumbOffset)}px`,
        };

        return (
            <div ref={thumbRef} className="thumb" style={style}>
                <div></div>
            </div>
        );
    }

    function getBars() {
        return timeline.allRecordings.map(({ startTime, duration }, i, recordings) => {
            const style: React.CSSProperties = {
                left: `${getPixelsFromTime(startTime)}px`,
                width: `${getPixelsFromDuration(duration) - 1}px`,
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
            width: `${getPixelsFromDuration(timeline.markerDuration)}px`,
        };

        while (currTime.isBefore(endTime) || currTime.isSame(endTime)) {
            elts.push(
                <div key={elts.length} className="marker" style={style}>
                    <span>{currTime.format('mm:ss')}</span>
                </div>
            );

            currTime = currTime.add(timeline.markerDuration);
        }

        return elts;
    }

    const onMouseMove = action((ev: React.MouseEvent<HTMLDivElement>) => {
        const { x } = getScrolledCoordinates(ev);
        const time = getTimeFromPixels(x);

        timeline.currentTime = time;
    });

    return (
        <div ref={timelineRef} className="timeline" onMouseMove={onMouseMove}>
            {getBars()}
            {getTimeMarkers()}
            {getThumb()}
        </div>
    );

    function getScrolledCoordinates(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const elt = ev.currentTarget;
        const rect = elt.getBoundingClientRect();
        const x = ev.clientX + elt.scrollLeft - rect.x;
        const y = ev.clientY + elt.scrollTop - rect.y;

        return { x, y };
    }
});
