import EventEmitter from 'events';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { RecordingOptions } from './dvrconfig';
import { SegmentCollection } from './segmentcollection';
import { SegmentedRecorder } from './segmentedrecorder';
import { pauseAndWait, playAndWait } from './videoutil';

export class LiveStreamRecorder extends EventEmitter {
    private readonly recorder: SegmentedRecorder;

    private constructor(
        public readonly videoElt: HTMLVideoElement,
        public readonly stream: MediaStream,
        public readonly segments: SegmentCollection,
        public readonly options: RecordingOptions
    ) {
        super();

        this.recorder = new SegmentedRecorder(this, segments, options);
    }

    static async createFromUserCamera(
        videoElt: HTMLVideoElement,
        segments: SegmentCollection,
        options: RecordingOptions
    ) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: options.source,
            },
        });

        assertLiveStreamAcquired();

        const recorder = new LiveStreamRecorder(videoElt, stream, segments, options);

        return recorder;

        function assertLiveStreamAcquired() {
            if (!stream) {
                throw new Error(`User denied access to the camera. Can't acquire live stream.`);
            }
        }
    }

    get currentTime() {
        return this.videoElt.currentTime;
    }

    private _recordingStartTime: Date | null = null;

    public get recordingStartTime() {
        if (!this._recordingStartTime) {
            throw new Error(
                `The recording start time is only available after startRecording() is called.`
            );
        }

        return this._recordingStartTime;
    }

    get duration() {
        if (!this.videoElt.paused) {
            this.updateEstimatedRecordingStartTime();
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            this.info('Using estimated duration of live feed.');

            const estimatedDuration = secondsSince(this.recordingStartTime);

            return estimatedDuration;
        }
    }

    ensureHasSegmentToRender() {
        return this.recorder.ensureHasSegmentToRender();
    }

    private updateEstimatedRecordingStartTime() {
        const recordingStartTime = subtractSecondsFromNow(this.videoElt.currentTime);

        if (recordingStartTime.getMilliseconds() < this._recordingStartTime!.getMilliseconds()) {
            this.log(`Updating recording start time ${recordingStartTime}`);
            this._recordingStartTime = recordingStartTime;
            this.emitStartTimeUpdate();
        }
    }

    async setAsVideoSource() {
        this.videoElt.src = '';
        this.videoElt.srcObject = this.stream;
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
    }

    releaseAsVideoSource() {
        this.videoElt.ontimeupdate = null;
    }

    get paused() {
        return this.videoElt.paused;
    }

    async startRecording() {
        this._recordingStartTime = new Date();
        await this.recorder.start();
    }

    async stopRecording() {
        await this.recorder.stop();
    }

    async play() {
        await playAndWait(this.videoElt);
        this.emitPlay();
    }

    async pause() {
        await pauseAndWait(this.videoElt);
        this.emitPause();
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.videoElt.currentTime, this.duration);
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitStartTimeUpdate() {
        this.emit('starttimeupdate');
    }

    private info(message: string) {
        if (this.options.logging === 'info' || this.options.logging === 'log') {
            console.info(message);
        }
    }

    private log(message: string) {
        if (this.options.logging === 'log') {
            console.log(message);
        }
    }
}
