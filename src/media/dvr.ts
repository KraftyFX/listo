import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { DEFAULT_DVR_OPTIONS } from './constants';
import { DvrOptions } from './dvrconfig';
import { Segment } from './interfaces';
import { Logger, getLog } from './logutil';
import { SegmentedPlayback } from './playback/segmentedplayback';
import { LiveStreamRecorder } from './recording/livestreamrecorder';
import { SegmentCollection } from './segments/segmentcollection';

export class DigitalVideoRecorder extends EventEmitter {
    private logger: Logger;
    private liveStreamRecorder!: LiveStreamRecorder;
    private playback!: SegmentedPlayback;
    private segments!: SegmentCollection;

    public readonly options: DvrOptions;

    constructor(public readonly videoElt: HTMLVideoElement, opt?: Partial<DvrOptions>) {
        super();

        this.options = _merge({}, DEFAULT_DVR_OPTIONS, opt);
        this.logger = getLog('dvr', this.options);
    }

    async showLiveStreamAndStartRecording() {
        this.segments = new SegmentCollection();
        this.segments.on('segmentadded', (segment) => {
            if (!this.isLive) {
                const { currentTime, speed } = this.playback;

                this.emitTimeUpdate(currentTime, this.liveStreamDuration, speed);
            }
        });

        this.liveStreamRecorder = await LiveStreamRecorder.createFromUserCamera(
            this.videoElt,
            this.segments,
            this.options.recording
        );
        this.liveStreamRecorder.on('recordingerror', console.error);

        await this.liveStreamRecorder.startRecording();
        await this.switchToLiveStream();

        this.playback = new SegmentedPlayback(this.videoElt, this.segments, this.options.playback);
    }

    private _isLive = false;

    public get isLive() {
        return this._isLive;
    }

    public get liveStreamDuration() {
        return this.liveStreamRecorder.duration;
    }

    async switchToLiveStream() {
        if (this._isLive) {
            return;
        }

        if (this.playback) {
            await this.playback.pause();
            this.playback.removeAllListeners();
            await this.playback.releaseAsVideoSource();
        }

        this.liveStreamRecorder.on('starttimeupdate', () => this.emitStartTimeUpdate());
        this.liveStreamRecorder.on('timeupdate', (currentTime, duration) =>
            this.emitTimeUpdate(currentTime, this.liveStreamDuration, 1)
        );
        this.liveStreamRecorder.on('play', () => this.emitPlay());
        this.liveStreamRecorder.on('pause', () => this.emitPause());
        await this.liveStreamRecorder.setAsVideoSource();

        this._isLive = true;

        await this.play();
        this.emitModeChange();
    }

    async switchToPlayback(timecode?: number) {
        if (!this._isLive) {
            timecode = timecode || this.playback.currentTime;

            await this.liveStreamRecorder.fillSegmentsToIncludeTimecode(timecode);
            await this.playback.goToTimecode(timecode);
        } else {
            timecode = timecode || this.liveStreamRecorder.currentTime;

            this.liveStreamRecorder.removeAllListeners();
            this.liveStreamRecorder.releaseAsVideoSource();

            this.playback.on('timeupdate', (currentTime, duration, speed) =>
                this.emitTimeUpdate(currentTime, this.liveStreamDuration, speed)
            );
            this.playback.on('play', () => this.emitPlay());
            this.playback.on('pause', () => this.emitPause());
            this.playback.on('ended', (where: 'start' | 'end') => this.onPlaybackEnded(where));
            this.playback.on('segmentrendered', (segment) => this.emitSegmentRendered(segment));

            await this.liveStreamRecorder.fillSegmentsToIncludeTimecode(timecode);
            await this.playback.setAsVideoSource(timecode);

            this._isLive = false;

            this.emitModeChange();
        }
    }

    private async onPlaybackEnded(where: 'start' | 'end') {
        if (where !== 'end') {
            return;
        }

        this.logger.info('Playback is at the end.  Switching to Live.');
        await this.switchToLiveStream();
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
            if (this.isNearEnd) {
                await this.switchToLiveStream();
            } else {
                await this.playback.play();
            }
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

        return this.liveStreamDuration - this.playback.currentTime <= 1;
    }

    public get isNearEnd() {
        this.assertIsInPlayback();

        return this.liveStreamDuration - this.playback.currentTime <= 5;
    }

    async goToPlaybackTime(timecode: number) {
        const wasPlaying = !this.paused;

        await this.switchToPlayback(timecode);

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
        if (this.isLive) {
            this.stopPollingLiveStreamRecordingDuration();
        } else {
            this.startPollingLiveStreamRecordingDuration('playback');
        }

        this.emit('modechange', this.isLive);
    }

    private interval: any = 0;

    private startPollingLiveStreamRecordingDuration(reason: string) {
        if (this.interval === 0) {
            this.logger.log(`Starting live duration polling. Reason=${reason}`);

            this.interval = setInterval(() => {
                const { currentTime, speed } = this.playback;

                this.emitTimeUpdate(currentTime, this.liveStreamDuration, speed);
            }, 1000);
        } else {
            this.logger.log(`(no-op) Polling live duration. Reason=${reason}`);
        }
    }

    private stopPollingLiveStreamRecordingDuration() {
        if (this.interval !== 0) {
            this.logger.log('Stopping live duration polling');
            clearInterval(this.interval);
            this.interval = 0;
        }
    }

    private emitTimeUpdate(currentTime: number, duration: number, speed: number): void {
        this.emit('timeupdate', currentTime, duration, speed);
    }

    private emitPlay() {
        this.stopPollingLiveStreamRecordingDuration();

        this.emit('play');
    }

    private emitPause() {
        if (!this.isLive) {
            this.startPollingLiveStreamRecordingDuration('pause');
        }

        this.emit('pause');
    }

    private emitSegmentRendered(segment: Segment) {
        this.emit('segmentrendered', segment);
    }

    private emitStartTimeUpdate() {
        this.emit('starttimeupdate');
    }
}
