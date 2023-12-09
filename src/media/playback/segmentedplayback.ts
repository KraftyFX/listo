import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { PlaybackOptions } from '~/media';
import { DEFAULT_PLAYBACK_OPTIONS } from '~/media/constants';
import { Segment } from '~/media/interfaces';
import { Logger, getLog } from '~/media/logutil';
import { formatSegment } from '~/media/segments/formatutil';
import { SegmentCollection } from '~/media/segments/segmentcollection';
import { PlaybackController } from './playbackcontroller';

export class SegmentedPlayback extends EventEmitter {
    private logger: Logger;
    private controller: PlaybackController;
    public readonly options: PlaybackOptions;

    constructor(
        public readonly videoElt: HTMLVideoElement,
        public readonly segments: SegmentCollection,
        options?: Partial<PlaybackOptions>
    ) {
        super();
        this.options = _merge({}, DEFAULT_PLAYBACK_OPTIONS, options);

        this.logger = getLog('pbk', this.options);
        this.controller = new PlaybackController(this, this.options);
    }

    get speed() {
        return this.controller.speed;
    }

    get currentTime() {
        if (!this.currentSegment) {
            throw new Error(
                `The current playback time is only available when it's the active source on the video element`
            );
        }

        return this.currentSegment.startTime + this.videoElt.currentTime;
    }

    get duration() {
        return this.segments.duration;
    }

    async setAsVideoSource(timestamp: number) {
        await this.renderSegmentAtTime(timestamp);

        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
        this.videoElt.ondurationchange = () => this.syncSegmentDuration(this.currentSegment!);

        this.controller.on('timeupdate', (timestamp) => this.renderSegmentAtTime(timestamp));
        this.controller.on('rewindstartreached', () => this.emitRewindStartReached());
        this.controller.on('ended', (where: 'start' | 'end') => this.emitEnded(where));
        this.controller.on('play', () => this.emitPlay());
        this.controller.on('pause', () => this.emitPause());

        if (this.paused) {
            this.emitPause();
        } else {
            this.emitPlay();
        }
    }

    async releaseAsVideoSource() {
        this.currentSegment = null;

        this.disableAutoPlayback();
        this.videoElt.ontimeupdate = null;
        this.videoElt.ondurationchange = null;

        this.controller.removeAllListeners();
        this.controller.stop();
    }

    private currentSegment: Segment | null = null;

    private async renderSegmentAtTime(timestamp: number) {
        const { segment, offset } = await this.segments.getSegmentAtTime(timestamp);

        this.logger.log(`Requesting segment at ${timestamp.toFixed(2)}`);

        this.renderSegment(segment, offset);
    }

    private renderSegment(segment: Segment, offset: number) {
        let segmentChanged = false;

        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            this.videoElt.src = segment.url;
            this.videoElt.srcObject = null;

            this.logger.log(`Rendering ${formatSegment(segment)}, offset=${offset.toFixed(2)}`);

            segmentChanged = true;
        }

        this.syncSegmentDuration(this.currentSegment);
        this.videoElt.currentTime = offset;

        if (segmentChanged) {
            this.emitSegmentRendered(segment);
        }
    }

    private syncSegmentDuration(segment: Segment) {
        const duration = this.tryGetActiveVideoDuration();

        if (duration !== -1) {
            this.segments.resetSegmentDuration(segment, duration);
            this.emitTimeUpdate();
        }
    }

    tryGetActiveVideoDuration() {
        const duration = this.videoElt.duration;

        return isNaN(duration) || duration == Number.POSITIVE_INFINITY ? -1 : duration;
    }

    private playNextSegment() {
        this.assertAutoPlaybackIsEnabled();

        const nextSegment = this.segments.getNextPlayableSegment(this.currentSegment!);

        if (nextSegment) {
            this.logger.log(`Playing next ${formatSegment(nextSegment)}`);
            this.renderSegment(nextSegment, 0);
            this.play();
        } else {
            this.logger.info('No next segment available');
            this.pause().then(() => this.emitEnded('end'));
        }
    }

    private assertAutoPlaybackIsEnabled() {
        if (!this.videoElt.onended) {
            throw new Error(`This function is meant to be used as part of auto playback.`);
        }
    }

    private enableAutoPlayNextSegmet() {
        this.videoElt.onended = () => this.playNextSegment();
    }

    private disableAutoPlayback() {
        this.videoElt.onended = null;
    }

    async goToTimecode(timecode: number) {
        await this.renderSegmentAtTime(timecode);
    }

    get paused() {
        return this.controller.paused;
    }

    async play() {
        if (this.isAtEnd) {
            this.logger.info(`Can't play. At playback end.`);
            return;
        }

        this.enableAutoPlayNextSegmet();
        await this.controller.play();
    }

    async pause() {
        this.disableAutoPlayback();
        await this.controller.pause();
    }

    get isAtMaxRewindSpeed() {
        return this.controller.isAtMaxRewindSpeed;
    }

    async rewind() {
        if (this.isAtBeginning) {
            this.logger.info(`Can't rewind. At playback start`);
            return;
        }

        this.disableAutoPlayback();
        await this.controller.rewind();
    }

    get isAtMinSlowSpeed() {
        return this.controller.isAtMinSlowSpeed;
    }

    async slowForward() {
        if (this.isAtEnd) {
            this.logger.info(`Cant slow forward. At playback end`);
            return;
        }

        this.disableAutoPlayback();
        await this.controller.slowForward();
    }

    get isAtMaxFastForwardSpeed() {
        return this.controller.isAtMaxFastForwardSpeed;
    }

    async fastForward() {
        if (this.isAtEnd) {
            this.logger.info(`Can't fast fowrardAt playback end`);
            return;
        }

        this.disableAutoPlayback();
        await this.controller.fastForward();
    }

    async nextFrame() {
        if (this.isAtEnd) {
            this.logger.info('At playback end');
            return;
        }

        this.disableAutoPlayback();
        await this.controller.nextFrame();
    }

    public get isAtBeginning() {
        return Boolean(
            this.segments.isFirstPlayableSegment(this.currentSegment) &&
                this.videoElt.currentTime === 0
        );
    }

    public get isAtEnd() {
        return Boolean(
            this.segments.isLastPlayableSegment(this.currentSegment) &&
                this.videoElt.currentTime === this.videoElt.duration
        );
    }

    private emitSegmentRendered(segment: Segment) {
        this.emit('segmentrendered', segment);
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.currentTime, this.duration, this.controller.speed);
    }

    private emitRewindStartReached() {
        this.emit('rewindstartreached');
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitEnded(where: 'start' | 'end') {
        this.emit('ended', where);
    }
}