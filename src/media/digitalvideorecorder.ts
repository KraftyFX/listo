import EventEmitter from "events";
import { LiveStream } from "./livestream";
import { LiveStreamRecorder } from "./livestreamrecorder";

export class DigitalVideoRecorder extends EventEmitter
{
    private videoElt:HTMLMediaElement;
    private liveStream:LiveStream;
    private playback:LiveStreamRecorder;

    constructor(videoElt:HTMLMediaElement) {
        super();

        this.videoElt = videoElt;
    }

    async initAndStartRecording() {
        this.liveStream = new LiveStream(this.videoElt);
        await this.liveStream.acquireCameraPermission();

        this.playback = new LiveStreamRecorder(this.liveStream);
        await this.playback.startRecording();

        await this.switchToLiveStream();
    }

    public get isLive() { return this._isLive; }
    private _isLive = false;

    async switchToLiveStream() {
        if (this._isLive) {
            return;
        }

        this._isLive = true;

        this.playback.removeAllListeners();
        await this.playback.releaseAsVideoSource();

        this.liveStream.on('timeupdate', (currentTime, duration) => this.emitTimeUpdate(currentTime, duration, 0));
        await this.liveStream.setAsVideoSource();

        await this.play();

        this.emitModeChange();
    }

    async switchToPlayback() {
        if (!this._isLive) {
            return;
        }

        this._isLive = false;

        const currentTime = this.liveStream.currentTime;

        this.liveStream.removeAllListeners();
        await this.liveStream.releaseAsVideoSource();
        
        this.playback.on('timeupdate', (currentTime, duration, speed) => this.emitTimeUpdate(currentTime, duration, speed));
        await this.playback.setAsVideoSource(currentTime);

        this.emitModeChange();
    }

    get canPlay() { 
        return this.isLive ? this.liveStream.canPlay : this.playback.canPlay;
    }

    async play() {
        if (this.isLive) {
            this.liveStream.play();
        } else {
            this.playback.play();
        }
    }

    async pause() {
        if (this.isLive) {
            await this.liveStream.pause();
            await this.switchToPlayback();
        } else {
            await this.playback.pause();
        }
    }

    async goToPlaybackTime(percent: number) {
        const wasPlaying = !this.canPlay;

        await this.switchToPlayback();
        await this.playback.goToTimecode(this.playback.duration * percent);

        if (wasPlaying) {
            await this.play();
        }
    }

    async rewind() {
        await this.switchToPlayback();

        await this.playback.rewind();
    }

    async slowForward() {
        this.assertIsInPlayback();
        
        await this.playback.slowForward();
    }

    async fastforward() {
        this.assertIsInPlayback();

        await this.playback.fastForward();
    }

    async nextFrame() {
        this.assertIsInPlayback();

        this.playback.nextFrame();
    }
    
    private assertIsInPlayback() {
        if (this.isLive) {
            throw new Error(`You can't fast forward when you're live`);
        }
    }

    private emitModeChange() {
        this.emit('modechange', this.isLive);
    }

    private emitTimeUpdate(currentTime: number, duration: number, speed: number): void {
        this.emit('timeupdate', currentTime, duration, speed);
    }
}