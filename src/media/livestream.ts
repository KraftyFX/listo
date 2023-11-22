import EventEmitter from "events";
import { nowAsSeconds } from "./dateutil";

const LOGITECH_BRIO_CAMERA_ID = '94f3aff55f18fcaa8238d5ae2437608852fcdeae132d61a15b94f197cf364acb';
const BUILT_IN = '5134f09eebf96f0a8bc51de97e5b2bfb78e846b2cb5791c35516010b8350fc18';

export class LiveStream extends EventEmitter
{
    videoElt: HTMLMediaElement;

    public get stream() { return this._stream; }
    private _stream: MediaStream;

    constructor(videoElt: HTMLMediaElement) {
        super();

        this.videoElt = videoElt;
    }

    async acquireCameraPermission() {
        this._stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: BUILT_IN // LOGITECH_BRIO_CAMERA_ID,
            }
        });

        this._startedAt = new Date();
    }

    get startedAt() { return this._startedAt; }
    private _startedAt:Date;

    get currentTime() { return this.videoElt.currentTime; }

    get duration() { 
        if (!this.videoElt.paused) {
            this._startedAt = nowAsSeconds(this.videoElt.currentTime);
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            console.trace('Using estimated duration of live feed.');

            const estimatedDuration = ((new Date().valueOf() - this.startedAt.valueOf()) / 1000);

            return estimatedDuration;
        }
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.videoElt.currentTime, this.duration);
    }

    async setAsVideoSource() {
        this.videoElt.src = null;
        this.videoElt.srcObject = this._stream;
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
    }

    async releaseAsVideoSource() {
        this.videoElt.ontimeupdate = null;
    }

    get canPlay() { return this.videoElt.paused; }

    async play() {
        await this.videoElt.play();
    }

    async pause() {
        await this.videoElt.pause();
    }
}