import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action, computed, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_DVR_OPTIONS, DEFAULT_TIMELINE_OPTIONS, MarkerConfig } from '~/renderer/media';
import { Segment } from '~/renderer/media/segments';
import { markerConfigEquals, markerFormats } from '../formatutil';
import { DvrStore } from './dvrStore';

export class TimelineStore {
    autoscroll = true;

    segments: Segment[] = [];

    viewportSize: Duration = dayjs.duration(DEFAULT_DVR_OPTIONS.timeline.viewport);
    markerSize: MarkerConfig = DEFAULT_TIMELINE_OPTIONS.marker;

    constructor(public readonly dvrStore: DvrStore) {
        makeAutoObservable<TimelineStore, 'firstRecording' | 'lastRecording'>(this, {
            markerSize: observable.deep,
            firstRecording: computed,
            lastRecording: computed,
        });
    }

    private _hasInit = false;

    public init() {
        this.listenForSegmentChanges();

        this._hasInit = true;
    }

    get markerFormatIndex() {
        return markerFormats.findIndex((m) => markerConfigEquals(m, this.markerSize));
    }

    set markerFormatIndex(value: number) {
        let max = 0;
        let min = 0;

        if (this.viewportInSec >= 1800) {
            min = 9;
            max = markerFormats.length - 1;
        } else if (this.viewportInSec >= 60 * 5) {
            min = 3;
            max = 5;
        } else if (this.viewportInSec >= 60 * 3) {
            min = 2;
            max = 4;
        } else if (this.viewportInSec >= 60) {
            min = 1;
            max = 2;
        } else {
            min = 0;
            max = 0;
        }

        value = Math.min(Math.max(min, value), max);

        this.markerSize = markerFormats[value];
    }

    set viewportInSec(value: number) {
        value = Math.min(Math.max(15, value), 3600);

        this.viewportSize = dayjs.duration(value, 'seconds');

        this.markerFormatIndex = this.markerFormatIndex;
    }

    get viewportInSec() {
        return this.viewportSize.asSeconds();
    }

    set minorInSec(value: number) {
        this.markerSize.minor.seconds = value;
    }

    get minorInSec() {
        return this.markerSize.minor.seconds!;
    }

    set majorInSec(value: number) {
        this.markerSize.major.seconds = value;
    }

    get majorInSec() {
        return this.markerSize.major.seconds!;
    }

    private assertHasInitialized() {
        if (!this._hasInit) {
            throw new Error(`The timeline store hasn't been initialized yet`);
        }
    }

    private listenForSegmentChanges() {
        this.segments = this.dvrStore.dvr.playableSegments;

        this.dvrStore.dvr.on(
            'segmentadded',
            action(() => {
                this.segments = this.dvrStore.dvr.playableSegments;
                this.dvrStore.refreshControlAbilities();
            })
        );

        this.dvrStore.dvr.on(
            'segmentupdated',
            action(() => {
                this.segments = this.dvrStore.dvr.playableSegments;
                this.dvrStore.refreshControlAbilities();
            })
        );
    }

    private get startOfTime() {
        const { startTime } = this.segments.length === 0 ? this.liveRecording : this.segments[0];

        return startTime;
    }

    private get endOfTime() {
        const { startTime, duration } = this.dvrStore.isLive
            ? this.liveRecording
            : this.segments.slice(-1)[0];

        return startTime.add(dayjs.duration(duration, 'seconds').asSeconds(), 'seconds');
    }

    get liveRecording(): Segment {
        this.assertHasInitialized();

        return {
            index: NaN,
            url: '',
            isPartial: false,
            hasErrors: false,
            startTime: this.dvrStore.recordingStartTime,
            duration: this.dvrStore.recordingDuration,
        };
    }

    get currentTime() {
        return this.dvrStore.currentTime;
    }

    set currentTime(time: Dayjs) {
        this.dvrStore.currentTime = time;
    }

    get startOfTimeline() {
        this.assertHasInitialized();

        const time = this.dvrStore.willHaveVideoDataToPlay ? this.startOfTime : this.currentTime;

        return this.getPrevMarkerStartTime(time);
    }

    get endOfTimeline() {
        this.assertHasInitialized();

        const time = this.dvrStore.willHaveVideoDataToPlay ? this.endOfTime : this.currentTime;
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);

        return this.getPrevMarkerStartTime(time).add(majorMarkerDuration);
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const durationInDay = dayjs.duration(time.diff(this.startOfTime.startOf('day')));
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);
        const secSinceLastMarker = durationInDay.asSeconds() % majorMarkerDuration.asSeconds();

        return time.subtract(secSinceLastMarker, 'seconds');
    }
}
