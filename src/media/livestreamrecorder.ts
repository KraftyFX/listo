import EventEmitter from "events";
import { ChunkedRecorder } from "./chunkedrecorder";
import { BUILT_IN } from "./constants";
import { nowAsSeconds } from "./dateutil";

export class LiveStreamRecorder extends EventEmitter
{
    private readonly chunkedRecorder:ChunkedRecorder;

    private constructor(public readonly videoElt: HTMLMediaElement, public readonly stream: MediaStream) {
        super();

        this.chunkedRecorder = new ChunkedRecorder(this);
    }

    static async createFromUserCamera(videoElt: HTMLMediaElement) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: BUILT_IN
            }
        });

        if (!stream) {
            throw new Error(`User denied camera permissions. Can't initialize.`);
        }

        const recorder = new LiveStreamRecorder(videoElt, stream);
        await recorder.startRecording();

        return recorder;
    }

    get startedAt() { return this._recordStartTime; }
    private _recordStartTime:Date;

    get currentTime() { return this.videoElt.currentTime; }

    get duration() { 
        if (!this.videoElt.paused) {
            this._recordStartTime = nowAsSeconds(this.videoElt.currentTime);
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            console.trace('Using estimated duration of live feed.');

            const estimatedDuration = ((new Date().valueOf() - this.startedAt.valueOf()) / 1000);

            return estimatedDuration;
        }
    }

    async setAsVideoSource() {
        this.videoElt.src = null;
        this.videoElt.srcObject = this.stream;
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
    }

    releaseAsVideoSource() {
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
}