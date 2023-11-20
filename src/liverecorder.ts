import { LiveStream } from "./livestream";
import { LiveStreamRecorder } from "./livestreamrecorder";

export class LiveRecorder
{
    private videoElt:HTMLMediaElement;
    private liveStream:LiveStream;
    private playback:LiveStreamRecorder;

    onUpdate?: (currentTime: number, duration: number, speed: number) => void;

    constructor(videoElt:HTMLMediaElement) {
        this.videoElt = videoElt;
    }

    async initAndStartRecording() {
        this.liveStream = new LiveStream(this.videoElt);
        await this.liveStream.init();

        this.playback = new LiveStreamRecorder(this.liveStream);
        await this.playback.initAndStartRecording();

        await this.switchToLiveStream();
    }

    async dispose() {
        await this.playback.stop();
    }

    public get isLive() { return this._isLive; }
    private _isLive = false;

    async switchToLiveStream() {
        if (this._isLive) {
            return;
        }

        this._isLive = true;

        this.playback.onUpdate = null;
        await this.playback.releaseAsVideoSource();

        this.liveStream.onUpdate = (currentTime, duration) => this.onUpdate(currentTime, duration, 0);
        await this.liveStream.setAsVideoSource();

        await this.play();

        this.raiseOnModeChange();
    }

    async switchToPlayback() {
        if (!this._isLive) {
            return;
        }

        this._isLive = false;

        const currentTime = this.liveStream.currentTime;

        this.liveStream.onUpdate = null;
        await this.liveStream.releaseAsVideoSource();
        
        this.playback.onUpdate = (currentTime, duration, speed) => this.onUpdate(currentTime, duration, speed);
        await this.playback.setAsVideoSource(currentTime);

        this.raiseOnModeChange();
    }

    onModeChange?: (isLive: boolean) => void;

    private raiseOnModeChange() {
        if (this.onModeChange) {
            this.onModeChange(this.isLive);
        }
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
}