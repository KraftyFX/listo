import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action, reaction } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { MarkerConfig } from '~/renderer/media';
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
    const [timelineWidthPx, setTimelineWidthPx] = useState(1);

    const timelineRef = useRef<HTMLDivElement>(null!);
    const markerUnderThumbRef = useRef<HTMLDivElement>(null);

    const animateMarkerUnderThumbIntoView = () => {
        markerUnderThumbRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: dvrStore.speed < 0 ? 'start' : 'end',
            inline: dvrStore.speed < 0 ? 'start' : 'end',
        });
    };

    useEffect(
        action(function mount() {
            timeline.markerSize = marker;

            setTimelineWidthPx(timelineRef.current.offsetWidth);

            const dispose = reaction(
                () => dvrStore.currentTime,
                () => {
                    if (timeline.autoscroll) {
                        animateMarkerUnderThumbIntoView();
                    }
                }
            );

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
        const viewportSec = viewport.asSeconds();
        const durationSec = duration.asSeconds();

        const pixelsPerSec = timelineWidthPx / viewportSec;
        const pixels = durationSec * pixelsPerSec;

        return pixels;
    }

    function getTimeFromPixels(x: number) {
        const viewportSec = viewport.asSeconds();
        const secPerPixel = viewportSec / timelineWidthPx;

        const duration = dayjs.duration({ seconds: x * secPerPixel });
        const time = timeline.startOfTimeline.add(duration.asSeconds(), 'seconds');

        return time;
    }

    function getThumb() {
        const thumbTime = timeline.currentTime;

        const style: React.CSSProperties = {
            left: `${getPixelsFromTime(thumbTime)}px`,
        };

        return (
            <div className="thumb" style={style}>
                <div>.</div>
            </div>
        );
    }

    function getSegments() {
        return timeline.allRecordings.map(
            ({ isPartial: isPartial, startTime, duration }, i, recordings) => {
                const style: React.CSSProperties = {
                    left: `${getPixelsFromTime(startTime)}px`,
                    width: `${getPixelsFromDuration(duration)}px`,
                };

                const classNames = [`bar`];

                if (isPartial) {
                    classNames.push(`partial`);
                }

                if (dvrStore.isLive && i === recordings.length - 1) {
                    classNames.push('live');
                }

                return <div key={i} className={classNames.join(' ')} style={style} />;
            }
        );
    }

    function getMarkers() {
        const thumbTime = timeline.currentTime;
        let currTime = timeline.startOfTimeline;

        const endOfTimeline = timeline.endOfTimeline;
        const viewportEndTime = getTimeFromPixels(timelineWidthPx - 1);
        const endTime = endOfTimeline.isBefore(viewportEndTime) ? viewportEndTime : endOfTimeline;

        const elts: React.JSX.Element[] = [];
        const minorMarkerDuration = dayjs.duration(timeline.markerSize.minor);

        const style: React.CSSProperties = {
            width: `${getPixelsFromDuration(minorMarkerDuration)}px`,
        };

        while (currTime.isBefore(endTime) || currTime.isSame(endTime)) {
            const { type, format } = getMarkerFormat(timeline.markerSize, currTime);
            const isMarkerUnderThumb =
                currTime.isBefore(thumbTime) &&
                thumbTime.isBefore(currTime.add(minorMarkerDuration.asSeconds(), 'seconds'));

            elts.push(
                <div
                    ref={isMarkerUnderThumb ? markerUnderThumbRef : undefined}
                    key={elts.length}
                    className={`marker ${type}`}
                    style={style}>
                    <span>{format}</span>
                </div>
            );

            currTime = currTime.add(minorMarkerDuration.asSeconds(), 'seconds');
        }

        return elts;
    }

    const onMouseDown = action((ev: React.MouseEvent<HTMLDivElement>) => {
        const { x } = getRelativeMouseCoordinates(ev);
        const time = getTimeFromPixels(x);

        timeline.currentTime = time;
    });

    const onMouseEnter = action(() => (timeline.autoscroll = false));
    const onMouseLeave = action(() => (timeline.autoscroll = true));

    return (
        <div
            ref={timelineRef}
            className="timeline"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}>
            <div onMouseDown={onMouseDown}>
                {getSegments()}
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
