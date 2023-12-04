import dayjs, { Dayjs } from 'dayjs';
import duration, { Duration } from 'dayjs/plugin/duration';
import { computed, makeObservable, observable } from 'mobx';
import { DvrStore } from './dvrStore';

dayjs.extend(duration);

export interface Bar {
    startTime: dayjs.Dayjs;
    duration: Duration;
}

export class TimelineStore {
    private readonly multiplierToMakeTestingEasier = 1;

    markerSizeInSec = 10;

    constructor(public readonly dvrStore: DvrStore, public readonly recordings: Bar[]) {
        makeObservable(this, {
            markerSizeInSec: observable,
            markerDuration: computed,
            startOfTimeline: computed,
            endOfTimeline: computed,
            liveRecording: computed,
            liveRecordingEndTime: computed,
            firstRecording: computed,
            lastRecording: computed,
            allRecordings: computed,
        });
    }

    get markerDuration(): Duration {
        return dayjs.duration({ seconds: this.markerSizeInSec });
    }

    get firstRecording() {
        return this.allRecordings[0];
    }

    get lastRecording() {
        const arr = this.allRecordings;
        return arr[arr.length - 1];
    }

    get allRecordings() {
        return [...this.recordings, this.liveRecording];
    }

    get liveRecording() {
        const durationInSec = this.dvrStore.duration * this.multiplierToMakeTestingEasier;

        return {
            startTime: this.dvrStore.recordingStartTime,
            duration: dayjs.duration({ seconds: durationInSec }),
        };
    }

    get liveRecordingEndTime() {
        const { startTime, duration } = this.liveRecording;

        return startTime.add(duration);
    }

    get currentTime() {
        const ms = dayjs.duration({ seconds: this.dvrStore.currentTime }).asMilliseconds();

        return this.firstRecording.startTime.add(ms, 'milliseconds');
    }

    set currentTime(time: Dayjs) {
        const offset = dayjs.duration(time.diff(this.firstRecording.startTime));

        this.dvrStore.currentTime = offset.asMilliseconds() / 1000;
    }

    get startOfTimeline() {
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, duration } = this.lastRecording;

        const endOfRecording = startTime.add(duration);

        return this.getPrevMarkerStartTime(endOfRecording).add(this.markerDuration);
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const durationInDay = dayjs.duration(time.diff(startOfDay));
        const msSinceLastMarker =
            durationInDay.asMilliseconds() % this.markerDuration.asMilliseconds();

        return time.subtract(msSinceLastMarker, 'milliseconds');
    }
}
