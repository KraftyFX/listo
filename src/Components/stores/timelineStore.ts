import dayjs, { Dayjs } from 'dayjs';
import { makeObservable, observable } from 'mobx';
import { DvrStore } from './dvrStore';

export interface Bar {
    startTime: Dayjs;
    durationInMin: number;
}

export class TimelineStore {
    private readonly multiplierToMakeTestingEasier = 1;
    public markerSizeInMin = 10;
    public minuteSizeInPx = 10;

    constructor(public readonly dvrStore: DvrStore, public readonly recordings: Bar[]) {
        makeObservable(this, {
            minuteSizeInPx: observable,
            markerSizeInMin: observable,
        });

        if (dvrStore.isLive) {
            recordings.push(this.liveRecording);
        }
    }

    private get firstRecording() {
        return this.recordings[0];
    }

    private get lastRecording() {
        return this.recordings[this.recordings.length - 1];
    }

    private get liveRecording() {
        return {
            startTime: this.dvrStore.recordingStartTime,
            durationInMin: dayjs
                .duration({ seconds: this.dvrStore.duration * this.multiplierToMakeTestingEasier })
                .asMinutes(),
        };
    }

    get currentTime() {
        return this.dvrStore.recordingStartTime.add(
            this.dvrStore.currentTime * this.multiplierToMakeTestingEasier,
            'seconds'
        );
    }

    get startOfTimeline() {
        const { startTime } = this.firstRecording;

        return this.getPrevMarkerStartTime(startTime);
    }

    get endOfTimeline() {
        const { startTime, durationInMin } = this.dvrStore.isLive
            ? this.liveRecording
            : this.lastRecording;

        const endOfRecording = startTime.add(durationInMin, 'minutes');

        return this.getPrevMarkerStartTime(endOfRecording).add(this.markerSizeInMin, 'minutes');
    }

    private getPrevMarkerStartTime(time: dayjs.Dayjs) {
        const minFromPrevMarkerStart =
            this.markerSizeInMin * Math.floor(time.minute() / this.markerSizeInMin);

        return time.startOf('hour').add(minFromPrevMarkerStart, 'minutes');
    }

    getTimelineMinutesFromTime(time: dayjs.Dayjs) {
        const startOfDay = this.firstRecording.startTime.startOf('day');
        const timelineStartInSec = this.startOfTimeline.diff(startOfDay, 'seconds');

        const seconds = time.diff(startOfDay, 'seconds') - timelineStartInSec;
        const minutes = seconds / 60;

        return minutes;
    }

    getAsPixels(timelineMinutes: number) {
        return timelineMinutes * this.minuteSizeInPx;
    }
}
