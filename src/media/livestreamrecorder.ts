import EventEmitter from 'events';
import { ChunkedRecorder } from './chunkedrecorder';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { RecordingOptions } from './dvrconfig';
import { pauseAndWait, playAndWait } from './videoutil';

export class LiveStreamRecorder extends EventEmitter {
    private readonly chunkedRecorder: ChunkedRecorder;

    private constructor(
        public readonly videoElt: HTMLMediaElement,
        public readonly stream: MediaStream,
        public readonly options: RecordingOptions
    ) {
        super();

        this.chunkedRecorder = new ChunkedRecorder(this, options);
    }

    static async createFromUserCamera(videoElt: HTMLMediaElement, options: RecordingOptions) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: options.source,
            },
        });

        assertLiveStreamAcquired();

        const recorder = new LiveStreamRecorder(videoElt, stream, options);

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

    private get recordingStartTime() {
        if (!this._recordingStartTime) {
            throw new Error(
                `The recording start time is only available after startRecording() is called.`
            );
        }

        return this._recordingStartTime;
    }

    get duration() {
        if (!this.videoElt.paused) {
            this._recordingStartTime = subtractSecondsFromNow(this.videoElt.currentTime);
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            this.info('Using estimated duration of live feed.');

            const estimatedDuration = secondsSince(this.recordingStartTime);

            return estimatedDuration;
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
        await this.chunkedRecorder.start();
    }

    async stopRecording() {
        await this.chunkedRecorder.stop();
    }

    async getRecordedVideoSegmentsUntilNow() {
        return await this.chunkedRecorder.getRecordedSegments();
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
