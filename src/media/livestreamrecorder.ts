import EventEmitter from "events";
import { ChunkedRecorder } from "./chunkedrecorder";
import { secondsSince, subtractSecondsFromNow } from "./dateutil";
import { RecordingOptions } from "./dvrconfig";

export class LiveStreamRecorder extends EventEmitter
{
    private readonly chunkedRecorder:ChunkedRecorder;

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
                deviceId: options.source
            }
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

    get currentTime() { return this.videoElt.currentTime; }
    private _recordStartTime:Date;

    get duration() { 
        if (!this.videoElt.paused) {
            this._recordStartTime = subtractSecondsFromNow(this.videoElt.currentTime);
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            this.info('Using estimated duration of live feed.');

            const estimatedDuration = secondsSince(this._recordStartTime);

            return estimatedDuration;
        }
    }

    async setAsVideoSource() {
        this.videoElt.src = null;
        this.videoElt.srcObject = this.stream;
        this.videoElt.onplay = () => this.emitPlay();
        this.videoElt.onpause = () => this.emitPause();
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
    }

    releaseAsVideoSource() {
        this.videoElt.onplay = null;
        this.videoElt.onpause = null;
        this.videoElt.ontimeupdate = null;
    }

    get paused() { return this.videoElt.paused; }

    async startRecording() {
        this._recordStartTime = new Date();
        await this.chunkedRecorder.start();
    }

    async stopRecording() {
        await this.chunkedRecorder.stop();
    }

    async getRecordedVideoSegmentsUntilNow() {
        return await this.chunkedRecorder.getRecordedSegments();
    }

    async play() {
        return this.videoElt.play();
    }

    async pause() {
        return this.videoElt.pause();
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