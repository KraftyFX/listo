import dayjs, { Dayjs } from 'dayjs';
import duration, { Duration } from 'dayjs/plugin/duration';
import { computed, makeAutoObservable, observable } from 'mobx';
import { DEFAULT_DVR_OPTIONS } from '~/media';
import { MarkerConfig } from '~/media/dvrconfig';
import { DvrStore } from './dvrStore';

dayjs.extend(duration);

export interface Bar {
    startTime: dayjs.Dayjs;
    duration: Duration;
}

export class TimelineStore {
    private readonly multiplierToMakeTestingEasier = 1;

    pastRecordings: Bar[] = [];
    markerSize: MarkerConfig = DEFAULT_DVR_OPTIONS.marker;

    constructor(public readonly dvrStore: DvrStore) {
        makeAutoObservable<TimelineStore, 'firstRecording' | 'lastRecording'>(this, {
            markerSize: observable.deep,
            firstRecording: computed,
            lastRecording: computed,
        });
    }

    private get firstRecording() {
        return this.allRecordings[0];
    }

    private get lastRecording() {
        const arr = this.allRecordings;
        return arr[arr.length - 1];
    }

    get allRecordings() {
        return [...this.pastRecordings, this.liveRecording];
    }

    get liveRecording() {
        const durationInSec = this.dvrStore.liveStreamDuration * this.multiplierToMakeTestingEasier;

        return {
            startTime: this.dvrStore.recordingStartTime,
            duration: dayjs.duration({ seconds: durationInSec }),
        };
    }

    get currentTime() {
        const ms = dayjs.duration({ seconds: this.dvrStore.currentTime }).asMilliseconds();

        return this.firstRecording.startTime.add(ms, 'milliseconds');
    }

    set currentTime(time: Dayjs) {
        const offset = dayjs.duration(time.diff(this.firstRecording.startTime));

        this.dvrStore.dvr.goToPlaybackTime(offset.asMilliseconds() / 1000);
    }

    get startOfTimeline() {
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, duration } = this.lastRecording;

        const endOfRecording = startTime.add(duration);
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);

        return this.getPrevMarkerStartTime(endOfRecording).add(majorMarkerDuration);
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const durationInDay = dayjs.duration(time.diff(startOfDay));
        const majorMarkerDuration = dayjs.duration(this.markerSize.minor);
        const msSinceLastMarker =
            durationInDay.asMilliseconds() % majorMarkerDuration.asMilliseconds();

        return time.subtract(msSinceLastMarker, 'milliseconds');
    }
}
