import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action, autorun } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';
import { MarkerConfig } from '~/media';
import { getMarkerFormat } from './formatutil';

export interface TimelineProps {
    dvrStore: DvrStore;
    autoScrollTimeout: number;
    viewport: Duration;
    marker: MarkerConfig;
}

export const Timeline = observer(function Timeline(props: TimelineProps) {
    const { dvrStore, viewport, marker } = props;
    const { timeline } = dvrStore;
    const [width, setWidth] = useState(1);

    const timelineRef = useRef<HTMLDivElement>(null!);
    const thumbRef = useRef<HTMLDivElement>(null);

    useEffect(
        action(function mount() {
            timeline.markerSize = marker;

            setWidth(timelineRef.current.offsetWidth);

            const dispose = autorun(() => {
                dvrStore.currentTime;

                thumbRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: dvrStore.speed < 0 ? 'start' : 'end',
                    inline: dvrStore.speed < 0 ? 'start' : 'end',
                });
            });

            return function dismount() {
                dispose();
            };
        }),
        []
    );

    function getPixelsFromTime(time: Dayjs) {
        const duration = dayjs.duration(time.diff(timeline.startOfTimeline));
        const pixels = getPixelsFromDuration(duration);

        return pixels;
    }

    function getPixelsFromDuration(duration: Duration) {
        const pixelsPerSec = width / (viewport.asMilliseconds() / 1000);
        const pixels = (duration.asMilliseconds() / 1000) * pixelsPerSec;

        return pixels;
    }

    function getTimeFromPixels(x: number) {
        const secPerPixel = viewport.asSeconds() / width;
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

    function getMarkers() {
        let currTime = timeline.startOfTimeline;

        const endOfTimeline = timeline.endOfTimeline;
        const viewportEndTime = getTimeFromPixels(width - 1);
        const endTime = endOfTimeline.isBefore(viewportEndTime) ? viewportEndTime : endOfTimeline;

        const elts: React.JSX.Element[] = [];
        const minorMarkerDuration = dayjs.duration(timeline.markerSize.minor);

        const style: React.CSSProperties = {
            width: `${getPixelsFromDuration(minorMarkerDuration)}px`,
        };

        while (currTime.isBefore(endTime) || currTime.isSame(endTime)) {
            const { type, format } = getMarkerFormat(timeline.markerSize, currTime);

            elts.push(
                <div key={elts.length} className={`marker ${type}`} style={style}>
                    <span>{format}</span>
                </div>
            );

            currTime = currTime.add(minorMarkerDuration);
        }

        return elts;
    }

    const onMouseDown = action((ev: React.MouseEvent<HTMLDivElement>) => {
        const { x } = getRelativeMouseCoordinates(ev);
        const time = getTimeFromPixels(x);

        timeline.currentTime = time;
    });

    const onMouseEnter = () => {};

    const onMouseLeave = () => {};

    return (
        <div
            ref={timelineRef}
            className="timeline"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}>
            <div onMouseDown={onMouseDown}>
                {getBars()}
                {getMarkers()}
                {getThumb()}
            </div>
        </div>
    );

    function getRelativeMouseCoordinates(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        const elt = ev.currentTarget;
        const rect = elt.getBoundingClientRect();
        const x = ev.clientX + elt.scrollLeft - rect.x;
        const y = ev.clientY + elt.scrollTop - rect.y;

        return { x, y };
    }
});
