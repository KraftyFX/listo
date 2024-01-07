import dayjs, { Dayjs } from 'dayjs';
import { action, computed, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_TIMELINE_OPTIONS, MarkerConfig } from '~/renderer/media';
import { Segment } from '~/renderer/media/segments/interfaces';
import { DvrStore } from './dvrStore';

export class TimelineStore {
    autoscroll = true;

    segments: Segment[] = [];
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

    private assertHasInitialized() {
        if (!this._hasInit) {
            throw new Error(`The timeline store hasn't been initialized yet`);
        }
    }

    private listenForSegmentChanges() {
        this.segments = this.dvrStore.dvr.playableSegments;

        this.dvrStore.dvr.on(
            'segmentadded',
            action(() => (this.segments = this.dvrStore.dvr.playableSegments))
        );

        this.dvrStore.dvr.on(
            'segmentupdated',
            action(() => (this.segments = this.dvrStore.dvr.playableSegments))
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
