import EventEmitter from 'events';
import { Segment } from './chunkedrecorder';
import { DEFAULT_DVR_OPTIONS } from './constants';
import { DvrOptions } from './dvrconfig';
import { LiveStreamRecorder } from './livestreamrecorder';
import { SegmentCollection } from './segmentcollection';
import { SegmentedPlayback } from './segmentedplayback';

export class DigitalVideoRecorder extends EventEmitter {
    private liveStreamRecorder!: LiveStreamRecorder;
    private playback!: SegmentedPlayback;
    public readonly options: DvrOptions;

    constructor(public readonly videoElt: HTMLMediaElement, opt?: Partial<DvrOptions>) {
        super();

        this.options = Object.assign({}, DEFAULT_DVR_OPTIONS, opt);
    }

    async showLiveStreamAndStartRecording() {
        this.liveStreamRecorder = await LiveStreamRecorder.createFromUserCamera(
            this.videoElt,
            this.options.recording
        );
        this.liveStreamRecorder.on('recordingerror', console.error);

        await this.liveStreamRecorder.startRecording();
        await this.switchToLiveStream();
    }

    public get isLive() {
        return this._isLive;
    }
    private _isLive = false;

    async switchToLiveStream() {
        if (this._isLive) {
            return;
        }

        this._isLive = true;

        if (this.playback) {
            this.playback.removeAllListeners();
            this.playback.releaseAsVideoSource();
        }

        this.liveStreamRecorder.on('timeupdate', (currentTime, duration) =>
            this.emitTimeUpdate(currentTime, duration, 0)
        );
        this.liveStreamRecorder.on('play', () => this.emitPlay());
        this.liveStreamRecorder.on('pause', () => this.emitPause());
        await this.liveStreamRecorder.setAsVideoSource();

        await this.play();

        this.emitModeChange();
    }

    get segments() {
        this.assertIsInPlayback();

        return this._segments;
    }

    private _segments!: SegmentCollection;

    async switchToPlayback() {
        if (!this._isLive) {
            return;
        }

        this._isLive = false;

        const currentTime = this.liveStreamRecorder.currentTime;

        this.liveStreamRecorder.removeAllListeners();
        this.liveStreamRecorder.releaseAsVideoSource();

        this._segments = await this.liveStreamRecorder.getRecordedVideoSegmentsUntilNow();

        this.playback = new SegmentedPlayback(this.videoElt, this._segments);
        this.playback.on('timeupdate', (currentTime, duration, speed) =>
            this.emitTimeUpdate(currentTime, duration, speed)
        );
        this.playback.on('play', () => this.emitPlay());
        this.playback.on('pause', () => this.emitPause());
        this.playback.on('segmentrendered', (segment) => this.emitSegmentRendered(segment));

        await this.playback.setAsVideoSource(currentTime);

        this.emitModeChange();
    }

    get paused() {
        return this.isLive ? this.liveStreamRecorder.paused : this.playback.paused;
    }

    async play() {
        if (this.isLive) {
            await this.liveStreamRecorder.play();
        } else {
            await this.playback.play();
        }
    }

    async pause() {
        if (this.isLive) {
            await this.liveStreamRecorder.pause();
            await this.switchToPlayback();
        } else {
            await this.playback.pause();
        }
    }

    async goToPlaybackTime(percent: number) {
        const wasPlaying = !this.paused;

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

    async fastForward() {
        this.assertIsInPlayback();

        await this.playback.fastForward();
    }

    async nextFrame() {
        this.assertIsInPlayback();

        this.playback.nextFrame();
    }

    private assertIsInPlayback() {
        if (this.isLive) {
            throw new Error(`You can only do this in playback mode`);
        }
    }

    private emitModeChange() {
        this.emit('modechange', this.isLive);
    }

    private emitTimeUpdate(currentTime: number, duration: number, speed: number): void {
        this.emit('timeupdate', currentTime, duration, speed);
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitSegmentRendered(segment: Segment) {
        this.emit('segmentrendered', segment);
    }
}
