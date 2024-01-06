import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action, computed, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_TIMELINE_OPTIONS, MarkerConfig } from '~/renderer/media';
import { DvrStore } from './dvrStore';

export interface Bar {
    startTime: dayjs.Dayjs;
    duration: Duration;
    isPartial: boolean;
}

export class TimelineStore {
    autoscroll = true;

    segments: Bar[] = [];
    markerSize: MarkerConfig = DEFAULT_TIMELINE_OPTIONS.marker;

    constructor(public readonly dvrStore: DvrStore) {
        makeAutoObservable<TimelineStore, 'firstRecording' | 'lastRecording'>(this, {
            markerSize: observable.deep,
            firstRecording: computed,
            lastRecording: computed,
        });
    }

    public init() {
        this.listenForSegmentAdded();
        this.listenForSegmentUpdated();
    }

    private listenForSegmentAdded() {
        this.dvrStore.dvr.on(
            'segmentadded',
            action(() => this.refreshRecordings())
        );
    }

    private listenForSegmentUpdated() {
        this.dvrStore.dvr.on(
            'segmentupdated',
            action(() => this.refreshRecordings())
        );
    }

    private refreshRecordings() {
        // TODO: Normalize on dayjs.duration?
        this.segments = this.dvrStore.dvr.playableSegments.map(
            ({ isPartial, startTime, duration }) => ({
                isPartial,
                startTime,
                duration: dayjs.duration(duration, 'seconds'),
            })
        );
    }

    private get firstRecording() {
        return this.allRecordings[0];
    }

    private get lastRecording() {
        const arr = this.allRecordings;
        return arr[arr.length - 1];
    }

    get allRecordings() {
        return [...this.segments, this.liveRecording];
    }

    get liveRecording(): Bar {
        return {
            isPartial: false,
            startTime: this.dvrStore.recordingStartTime,
            duration: dayjs.duration(this.dvrStore.recordingDuration, 'seconds'),
        };
    }

    get currentTime() {
        return this.dvrStore.currentTime;
    }

    set currentTime(time: Dayjs) {
        this.dvrStore.currentTime = time;
    }

    get startOfTimeline() {
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, duration } = this.lastRecording;

        const endOfRecording = startTime.add(duration.asSeconds(), 'seconds');
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);

        return this.getPrevMarkerStartTime(endOfRecording).add(majorMarkerDuration);
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const durationInDay = dayjs.duration(time.diff(startOfDay));
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);
        const secSinceLastMarker = durationInDay.asSeconds() % majorMarkerDuration.asSeconds();

        return time.subtract(secSinceLastMarker, 'seconds');
    }
}
