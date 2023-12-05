import EventEmitter from 'events';
import { Segment } from './chunkedrecorder';
import { DEFAULT_DVR_OPTIONS } from './constants';
import { DvrOptions } from './dvrconfig';
import { LiveStreamRecorder } from './livestreamrecorder';
import { SegmentedPlayback } from './segmentedplayback';

export class DigitalVideoRecorder extends EventEmitter {
    private liveStreamRecorder!: LiveStreamRecorder;
    private playback!: SegmentedPlayback;
    public readonly options: DvrOptions;

    constructor(public readonly videoElt: HTMLMediaElement, opt?: Partial<DvrOptions>) {
        super();

        this.options = Object.assign(DEFAULT_DVR_OPTIONS, opt);
    }

    async showLiveStreamAndStartRecording() {
        this.liveStreamRecorder = await LiveStreamRecorder.createFromUserCamera(
            this.videoElt,
            this.options.recording
        );
        this.liveStreamRecorder.on('recordingerror', console.error);
        this.liveStreamRecorder.on('starttimeupdate', console.error);

        await this.liveStreamRecorder.startRecording();
        await this.switchToLiveStream();

        this.playback = new SegmentedPlayback(this.videoElt);
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
            await this.playback.pause();
            this.playback.removeAllListeners();
            await this.playback.releaseAsVideoSource();
        }

        this.liveStreamRecorder.on('starttimeupdate', () => this.emitStartTimeUpdate());
        this.liveStreamRecorder.on('timeupdate', (currentTime, duration) =>
            this.emitTimeUpdate(currentTime, duration, 1)
        );
        this.liveStreamRecorder.on('play', () => this.emitPlay());
        this.liveStreamRecorder.on('pause', () => this.emitPause());
        await this.liveStreamRecorder.setAsVideoSource();

        await this.play();

        this.emitModeChange();
    }

    get segments() {
        this.assertIsInPlayback();

        return this.playback.segments;
    }

    async switchToPlayback() {
        if (!this._isLive) {
            return;
        }

        this._isLive = false;

        const currentTime = this.liveStreamRecorder.currentTime;

        this.liveStreamRecorder.removeAllListeners();
        this.liveStreamRecorder.releaseAsVideoSource();

        this.playback.on('timeupdate', (currentTime, duration, speed) =>
            this.emitTimeUpdate(currentTime, duration, speed)
        );
        this.playback.on('play', () => this.emitPlay());
        this.playback.on('pause', () => this.emitPause());
        this.playback.on('ended', (where: 'start' | 'end') => this.onPlaybackEnded(where));
        this.playback.on('segmentrendered', (segment) => this.emitSegmentRendered(segment));

        const segments = await this.liveStreamRecorder.getRecordedVideoSegmentsUntilNow();

        await this.playback.setAsVideoSource(segments, currentTime);

        this.emitModeChange();
    }

    private async onPlaybackEnded(where: 'start' | 'end') {
        if (where !== 'end') {
            return;
        }

        if (this.isNearEnd) {
            this.info('Playback is super close to the end.  Switching to Live.');
            await this.switchToLiveStream();
        } else {
            this.info('Playback finished but far away from live. Getting more recorded video.');
            await this.updateWithLatestLiveRecordingDataAndResumePlaying();
        }
    }

    private async updateWithLatestLiveRecordingDataAndResumePlaying() {
        const endTime = this.playback.duration;
        const segments = await this.liveStreamRecorder.getRecordedVideoSegmentsUntilNow();

        await this.playback.replaceActiveSegments(segments, endTime);
        await this.play();
    }

    get recordingStartTime() {
        return this.liveStreamRecorder.recordingStartTime;
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

    public get isAtBeginning() {
        this.assertIsInPlayback();
        return this.playback.isAtBeginning;
    }

    public get isAtEnd() {
        this.assertIsInPlayback();
        return this.playback.isAtEnd;
    }

    public get isNearEnd() {
        this.assertIsInPlayback();

        return this.liveStreamRecorder.duration - this.playback.duration < 5;
    }

    async goToPlaybackTime(percent: number) {
        const wasPlaying = !this.paused;

        await this.switchToPlayback();
        await this.playback.goToTimecode(this.playback.duration * percent);

        if (wasPlaying) {
            await this.play();
        }
    }

    get isAtMaxRewindSpeed() {
        this.assertIsInPlayback();

        return this.playback.isAtMaxRewindSpeed;
    }

    async rewind() {
        await this.switchToPlayback();

        await this.playback.rewind();
    }

    get isAtMinSlowSpeed() {
        this.assertIsInPlayback();

        return this.playback.isAtMinSlowSpeed;
    }

    async slowForward() {
        this.assertIsInPlayback();

        await this.playback.slowForward();
    }

    get isAtMaxFastForwardSpeed() {
        this.assertIsInPlayback();

        return this.playback.isAtMaxFastForwardSpeed;
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

    private emitStartTimeUpdate() {
        this.emit('starttimeupdate');
    }

    private info(message: string) {
        if (this.options.playback.logging === 'info' || this.options.playback.logging === 'log') {
            console.info(message);
        }
    }
}
