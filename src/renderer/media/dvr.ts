import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { DEFAULT_DVR_OPTIONS } from './constants';
import TypedEventEmitter from './eventemitter';
import { DvrOptions } from './interfaces';
import { Logger, getLog } from './logutil';
import { SegmentedPlayback } from './playback/segmentplayback';
import { LiveStreamRecorder } from './recording/livestreamrecorder';
import { Segment } from './segments/interfaces';
import { SegmentCollection } from './segments/segmentcollection';

type DvrEvents = {
    modechange: (isLive: boolean) => void;
    play: () => void;
    pause: () => void;
    playbackupdate: (currentTimeAsTime: Dayjs, speed: number) => void;
    liveupdate: () => void;
    segmentadded: () => void;
    segmentupdated: () => void;
    segmentrendered: (segment: Segment) => void;
};

export class DigitalVideoRecorder extends (EventEmitter as new () => TypedEventEmitter<DvrEvents>) {
    private logger: Logger;
    private liveStreamRecorder!: LiveStreamRecorder;
    private playback!: SegmentedPlayback;
    private segments!: SegmentCollection;

    readonly options: DvrOptions;

    constructor(
        public readonly videoElt: HTMLVideoElement,
        public readonly stream: MediaStream,
        options?: Partial<DvrOptions>
    ) {
        super();

        this.options = _merge({}, DEFAULT_DVR_OPTIONS, options);
        this.logger = getLog('dvr', this.options);

        this.segments = new SegmentCollection();
        this.segments.on('reset', (segment) => this.emitSegmentUpdated());
        this.segments.on('segmentadded', (segment) => this.emitSegmentAdded());

        this.playback = new SegmentedPlayback(this.videoElt, this.segments, this.options.playback);

        this.liveStreamRecorder = new LiveStreamRecorder(
            this.videoElt,
            this.stream,
            this.segments,
            this.options.recording
        );
    }

    dispose() {
        this.stopRecording();
        this.removeAllListeners();
        this.stopPollingLiveStreamRecordingDuration();
    }

    async showLiveStreamAndStartRecording() {
        await this.startRecording();
        await this.switchToLiveStream();
    }

    async startRecording() {
        await this.liveStreamRecorder.startRecording();

        if (!this.isLive) {
            this.startPollingLiveStreamRecordingDuration('playback');
        }
    }

    async stopRecording() {
        if (this.isLive) {
            await this.switchToPlayback();
        }

        await this.liveStreamRecorder.stopRecording();
        this.stopPollingLiveStreamRecordingDuration();
    }

    private _isLive = false;

    get isLive() {
        return this._isLive;
    }

    get allSegments() {
        return this.segments.segments;
    }

    get recording() {
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

        this.logger.info('Switching to live stream');

        if (this.playback) {
            await this.playback.pause();
            this.playback.removeAllListeners();
            await this.playback.releaseAsVideoSource();
        }

        this.liveStreamRecorder.on('update', () => this.emitLiveUpdate());
        this.liveStreamRecorder.on('play', () => this.emitPlay());
        this.liveStreamRecorder.on('pause', () => this.emitPause());
        await this.liveStreamRecorder.setAsVideoSource();

        this._isLive = true;

        await this.play();
        this.emitModeChange();
    }

    async switchToPlayback(time?: Dayjs) {
        if (!this._isLive) {
            time = time || this.playback.currentTimeAsTime;

            // This fill segments call is needed b/c the user is in playback mode
            // and might have jumped to a time that is still actively being recorded
            await this.liveStreamRecorder.tryFillSegments(time);
            await this.playback.goToTime(time);
        } else {
            this.assertWillHaveVideoDataToPlay();

            this.liveStreamRecorder.removeAllListeners();
            this.liveStreamRecorder.releaseAsVideoSource();

            this.playback.on('timeupdate', (currentTime, speed) =>
                this.emitPlaybackUpdate(this.playback.currentTimeAsTime, speed)
            );
            this.playback.on('play', () => this.emitPlay());
            this.playback.on('pause', () => this.emitPause());
            this.playback.on('ended', (where: 'start' | 'end') => this.onPlaybackEnded(where));
            this.playback.on('segmentrendered', (segment) => this.emitSegmentRendered(segment));

            if (this.isRecording) {
                time = time || this.recording.endTime.subtract(1, 'second');
            } else {
                time = time || this.segments.lastSegmentEndTime.subtract(1, 'second');
            }

            this.logger.info(`Switching to playback at ${this.getAsTimecode(time)}`);

            await this.liveStreamRecorder.tryFillSegments(time);
            await this.playback.setAsVideoSource(time);

            this._isLive = false;

            this.emitModeChange();
            this.startPollingLiveStreamRecordingDuration('playback');
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

        return this.recording.endTime.diff(this.playback.currentTimeAsTime) <= 1000;
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

    private emitPlaybackUpdate(currentTimeAsTime: Dayjs, speed: number): void {
        this.emit('playbackupdate', currentTimeAsTime, speed);
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
