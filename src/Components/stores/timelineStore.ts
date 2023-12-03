import dayjs from 'dayjs';
import duration, { Duration } from 'dayjs/plugin/duration';
import { action, computed, makeObservable, observable } from 'mobx';
import { DvrStore } from './dvrStore';

dayjs.extend(duration);

export interface Bar {
    startTime: dayjs.Dayjs;
    duration: Duration;
}

export class TimelineStore {
    private readonly multiplierToMakeTestingEasier = 1;

    viewportWidthInPx: number = 600;
    viewportSizeInSec: number = 60;

    markerSizeInSec = 10;

    constructor(public readonly dvrStore: DvrStore, public readonly recordings: Bar[]) {
        makeObservable(this, {
            markerSizeInSec: observable,
            markerDuration: computed,
            viewportDuration: computed,
            viewportSizeInSec: observable,
            viewportWidthInPx: observable,
            setCurrentTimeBySeconds: action,
        });

        recordings.push(this.liveRecording);
    }

    private get firstRecording() {
        return this.recordings[0];
    }

    private get lastRecording() {
        return this.recordings[this.recordings.length - 1];
    }

    get liveRecording(): Bar {
        const durationInSec = this.dvrStore.duration * this.multiplierToMakeTestingEasier;

        // return {
        //     startTime: dayjs().startOf('hour'),
        //     duration: dayjs.duration({ seconds: durationInSec }),
        // };

        return {
            startTime: this.dvrStore.recordingStartTime,
            duration: dayjs.duration({ seconds: durationInSec }),
        };
    }

    get liveRecordingCurrentTime() {
        const currentTimeInSec = this.dvrStore.currentTime * this.multiplierToMakeTestingEasier;

        // return this.startOfTimeline.add(currentTimeInSec, 'seconds');

        return this.dvrStore.recordingStartTime.add(currentTimeInSec, 'seconds');
    }

    setCurrentTimeBySeconds(seconds: number) {
        this.dvrStore.currentTime = seconds;
    }

    get startOfTimeline() {
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, duration } = this.dvrStore.isLive
            ? this.liveRecording
            : this.lastRecording;

        const endOfRecording = startTime.add(duration);

        return this.getPrevMarkerStartTime(endOfRecording).add(this.markerDuration);
    }

    get markerDuration(): Duration {
        return dayjs.duration({ seconds: this.markerSizeInSec });
    }

    get viewportDuration(): Duration {
        return dayjs.duration({ seconds: this.viewportSizeInSec });
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const durationInDay = dayjs.duration(time.diff(startOfDay));
        const msSinceLastMarker =
            durationInDay.asMilliseconds() % this.markerDuration.asMilliseconds();

        return time.subtract(msSinceLastMarker, 'milliseconds');
    }

    getAsPixelOffset(duration: Duration) {
        const pixelsPerSec = this.viewportWidthInPx / this.viewportDuration.asSeconds();
        return duration.asSeconds() * pixelsPerSec;
    }

    getAsTimelineSeconds(x: number) {
        const secPerPixel = this.viewportDuration.asSeconds() / this.viewportWidthInPx;
        return x * secPerPixel;
    }
}
