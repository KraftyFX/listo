import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { DEFAULT_DVR_OPTIONS } from './constants';
import TypedEventEmitter from './eventemitter';
import { DvrOptions } from './interfaces';
import { Logger, getLog } from './logutil';
import { SegmentPlayback } from './playback/segmentplayback';
import { LiveStreamRecorder } from './recording/livestreamrecorder';
import { Segment } from './segments/interfaces';
import { SegmentCollection } from './segments/segmentcollection';

type DvrEvents = {
    modechange: (isLive: boolean) => void;
    play: () => void;
    pause: () => void;
    playbackupdate: (currentTime: Dayjs, speed: number) => void;
    liveupdate: () => void;
    segmentadded: () => void;
    segmentupdated: () => void;
    segmentrendered: (segment: Segment) => void;
};

export class DigitalVideoRecorder extends (EventEmitter as new () => TypedEventEmitter<DvrEvents>) {
    private logger: Logger;
    private liveStreamRecorder: LiveStreamRecorder;
    private playback: SegmentPlayback;
    private segments: SegmentCollection;

    readonly options: DvrOptions;

    constructor(options?: Partial<DvrOptions>) {
        super();

        this.options = _merge({}, DEFAULT_DVR_OPTIONS, options);
        this.logger = getLog('dvr', this.options);

        this.segments = new SegmentCollection();

        // TODO: Fill segments from pre-recordings on disk

        this.segments.on('reset', (segment) => this.emitSegmentUpdated());
        this.segments.on('segmentadded', (segment) => this.emitSegmentAdded());

        this.playback = new SegmentPlayback(this.segments, this.options.playback);

        this.liveStreamRecorder = new LiveStreamRecorder(this.segments, this.options.recording);
    }

    dispose() {
        this.stopRecording();
        this.removeAllListeners();
        this.stopPollingLiveStreamRecordingDuration();
    }

    async showLiveStreamAndStartRecording() {
        await this.switchToLiveStream();
        await this.startRecording();
    }

    async startRecording() {
        await this.liveStreamRecorder.startRecording();
    }

    async stopRecording() {
        await this.liveStreamRecorder.stopRecording();
    }

    private _isLive = false;

    get isLive() {
        return this._isLive;
    }

    get playableSegments() {
        return this.segments.segments;
    }

    get liveRecording() {
        if (this.isRecording) {
            return this.liveStreamRecorder.recording;
        } else {
            const endTime = this.segments.lastSegmentEndTime;

            return {
                startTime: endTime,
                duration: 0,
                endTime: endTime,
            };
        }
    }

    async switchToLiveStream() {
        if (this._isLive) {
            return;
        }

        this.stopPollingLiveStreamRecordingDuration();

        await this.playback.pause();
        this.playback.removeAllListeners();
        await this.playback.releaseAsVideoSource();

        this.liveStreamRecorder.on('update', () => this.emitLiveUpdate());
        this.liveStreamRecorder.on('play', () => this.emitPlay());
        this.liveStreamRecorder.on('pause', () => this.emitPause());

        this.logger.info('Switching to live stream');
        await this.liveStreamRecorder.setAsVideoSource();

        this._isLive = true;

        await this.play();
        this.emitModeChange();
    }

    async switchToPlayback(time?: Dayjs) {
        if (!this._isLive) {
            time = time || this.playback.currentTime;

            // This fill segments call is needed b/c the user is in playback mode
            // and might have jumped to a time that is still actively being recorded
            await this.ensureVideoDataForTime(time);
            await this.playback.goToTime(time);
        } else {
            this.assertWillHaveVideoDataToPlay();

            this.playback.on('timeupdate', (currentTime, speed) =>
                this.emitPlaybackUpdate(this.playback.currentTime, speed)
            );
            this.playback.on('play', () => this.emitPlay());
            this.playback.on('pause', () => this.emitPause());
            this.playback.on('ended', (where: 'start' | 'end') => this.onPlaybackEnded(where));
            this.playback.on('segmentrendered', (segment) => this.emitSegmentRendered(segment));

            if (this.isRecording) {
                time = time || this.liveRecording.endTime.subtract(1, 'second');
            } else {
                time = time || this.segments.lastSegmentEndTime.subtract(1, 'second');
            }

            await this.ensureVideoDataForTime(time);
            this.liveStreamRecorder.removeAllListeners();
            await this.liveStreamRecorder.releaseAsVideoSource();

            this.logger.info(`Switching to playback at ${this.getAsTimecode(time)}`);
            await this.playback.setAsVideoSource(time);

            this._isLive = false;

            this.emitModeChange();
            this.startPollingLiveStreamRecordingDuration('playback');
        }
    }

    private async ensureVideoDataForTime(time: dayjs.Dayjs) {
        if (this.isInActiveRecordingWindow(time)) {
            await this.liveStreamRecorder.forceFillWithLatestVideoData();

            this.assertContainsVideoDataForTime(time);

            return true;
        } else {
            return this.segments.containsTime(time);
        }
    }

    private isInActiveRecordingWindow(time: Dayjs) {
        if (this.isRecording) {
            const { startTime, endTime } = this.liveRecording;

            return time.isBetween(startTime, endTime);
        } else {
            return false;
        }
    }

    private assertContainsVideoDataForTime(time: dayjs.Dayjs) {
        if (!this.segments.containsTime(time)) {
            const timecode = this.getAsTimecode(time);

            throw new Error(
                `The live stream recorder was forced to render all the data it had but contains nothing for ${timecode}`
            );
        }
    }

    private assertWillHaveVideoDataToPlay() {
        if (!this.isRecording && this.segments.isEmpty) {
            throw new Error(`Playback without existing/anticipated video data is not supported.`);
        }
    }

    private getAsTimecode(time: Dayjs) {
        if (this.segments.isEmpty) {
            return this.liveStreamRecorder.getAsTimecode(time);
        } else {
            return this.segments.getAsTimecode(time);
        }
    }

    private async onPlaybackEnded(where: 'start' | 'end') {
        if (where !== 'end') {
            return;
        }

        if (this.isRecording) {
            this.logger.info('Playback is at the end.');
            await this.switchToLiveStream();
        } else {
            this.logger.info(`There is no recording happening. Doing nothing.`);
        }
    }

    get paused() {
        return this.isLive ? this.liveStreamRecorder.paused : this.playback.paused;
    }

    async play() {
        if (this.isLive) {
            await this.liveStreamRecorder.play();
        } else {
            if (this.playback.isAtEnd) {
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

    get isRecording() {
        return this.liveStreamRecorder.isRecording;
    }

    get isAtBeginning() {
        this.assertIsInPlayback();

        return this.playback.isAtBeginning;
    }

    get isAtEnd() {
        this.assertIsInPlayback();

        return this.playback.isAtEnd;
    }

    async goToPlaybackTime(time: Dayjs) {
        const wasPlaying = !this.paused;

        await this.switchToPlayback(time);

        if (wasPlaying) {
            try {
                await this.play();
            } catch (e) {
                console.warn(e);
            }
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

    private interval: any = 0;

    private startPollingLiveStreamRecordingDuration(reason: string) {
        if (this.interval === 0) {
            this.logger.log(`Starting live duration polling. Reason=${reason}`);
            const pollTime = dayjs.duration(this.options.liveDurationPollingInterval);
            this.interval = setInterval(() => this.emitLiveUpdate(), pollTime.asMilliseconds());
        } else {
            this.logger.log(`(no-op) Polling live duration. Reason=${reason}`);
        }
    }

    private emitSegmentUpdated() {
        this.emit('segmentupdated');
    }

    private emitSegmentAdded() {
        this.emit('segmentadded');
    }

    private stopPollingLiveStreamRecordingDuration() {
        if (this.interval !== 0) {
            this.logger.log('Stopping live duration polling');
            clearInterval(this.interval);
            this.interval = 0;
        }
    }

    private emitPlaybackUpdate(currentTime: Dayjs, speed: number): void {
        this.emit('playbackupdate', currentTime, speed);
    }

    private emitPlay() {
        this.stopPollingLiveStreamRecordingDuration();

        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitSegmentRendered(segment: Segment) {
        this.emit('segmentrendered', segment);
    }

    private emitLiveUpdate() {
        this.emit('liveupdate');
    }
}
