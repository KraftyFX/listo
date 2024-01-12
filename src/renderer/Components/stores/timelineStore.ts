import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { action, computed, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_DVR_OPTIONS, DEFAULT_TIMELINE_OPTIONS, MarkerConfig } from '~/renderer/media';
import { Segment } from '~/renderer/media/segments';
import { minmin, minsec } from '../formatutil';
import { DvrStore } from './dvrStore';

export class TimelineStore {
    autoscroll = true;

    segments: Segment[] = [];

    private _viewportSize: Duration = dayjs.duration(DEFAULT_DVR_OPTIONS.timeline.viewport);
    markerSize: MarkerConfig = DEFAULT_TIMELINE_OPTIONS.marker;

    constructor(public readonly dvrStore: DvrStore) {
        makeAutoObservable<TimelineStore, '_viewportSize' | 'firstRecording' | 'lastRecording'>(
            this,
            {
                markerSize: observable.deep,
                _viewportSize: observable,
                firstRecording: computed,
                lastRecording: computed,
            }
        );

        const savedViewPortInSec = parseInt(localStorage.getItem('viewportInSec') || '0');

        this.viewportSize = !isNaN(savedViewPortInSec)
            ? dayjs.duration(savedViewPortInSec, 'seconds')
            : dayjs.duration(DEFAULT_TIMELINE_OPTIONS.viewport);
    }

    private _hasInit = false;

    public init() {
        this.listenForSegmentChanges();

        this._hasInit = true;
    }

    get viewportSize() {
        return this._viewportSize;
    }

    set viewportSize(value: Duration) {
        const valueSec = value.asSeconds();

        value = dayjs.duration(Math.min(Math.max(15, valueSec), 3600), 'seconds');

        this._viewportSize = value;

        localStorage.setItem('viewportInSec', valueSec.toString());

        switch (true) {
            case valueSec <= 60 * 1:
                this.markerSize = minsec(1, 5);
                break;
            case valueSec <= 60 * 3:
                this.markerSize = minsec(1, 15);
                break;
            case valueSec <= 60 * 5:
                this.markerSize = minsec(1, 30);
                break;
            case valueSec <= 60 * 6:
                this.markerSize = minmin(5, 1);
                break;
            case valueSec <= 60 * 10:
                this.markerSize = minmin(10, 1);
                break;
            case valueSec <= 60 * 12:
                this.markerSize = minmin(15, 1);
                break;
            case valueSec <= 60 * 45:
                this.markerSize = minmin(15, 5);
                break;
            case valueSec <= 60 * 120:
                this.markerSize = minmin(30, 5);
                break;
            default:
                this.markerSize = minmin(30, 15);
                break;
        }
    }

    set viewportInSec(value: number) {
        this.viewportSize = dayjs.duration(value, 'seconds');
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

    widthInPx: number = 1;

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
