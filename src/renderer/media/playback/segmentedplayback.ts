import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { PlaybackOptions } from '~/renderer/media';
import { DEFAULT_PLAYBACK_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { formatSegment } from '~/renderer/media/segments/formatutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import TypedEventEmitter from '../eventemitter';
import { Segment } from '../segments/interfaces';
import { PlaybackController } from './playbackcontroller';

type SegmentedPlaybackEvents = {
    segmentrendered: (segment: Segment) => void;

    play: () => void;
    pause: () => void;
    ended: (where: 'start' | 'end') => void;
    timeupdate: (currentTime: number, speed: number) => void;
};

export class SegmentedPlayback extends (EventEmitter as new () => TypedEventEmitter<SegmentedPlaybackEvents>) {
    private logger: Logger;
    private controller: PlaybackController;
    public readonly options: PlaybackOptions;
    private readonly _segments: SegmentCollection;

    constructor(
        public readonly videoElt: HTMLVideoElement,
        segments: SegmentCollection,
        options?: Partial<PlaybackOptions>
    ) {
        super();

        this._segments = segments;
        this.options = _merge({}, DEFAULT_PLAYBACK_OPTIONS, options);

        this.logger = getLog('pbk', this.options);
        this.controller = new PlaybackController(this, this.options);
    }

    private get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get speed() {
        return this.controller.speed;
    }

    get currentTime() {
        this.assertIsActiveVideoSource();

        return this.currentSegment.startTime + this.videoElt.currentTime;
    }

    private _isVideoSource = false;

    async setAsVideoSource(timecode: number) {
        this.assertHasSegments();

        await this.goToTimecode(timecode);

        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
        this.videoElt.ondurationchange = () => this.syncSegmentDuration(this.currentSegment);

        this.controller.on('ended', (where: 'start' | 'end') => this.emitEnded(where));
        this.controller.on('play', () => this.emitPlay());
        this.controller.on('pause', () => this.emitPause());

        this._isVideoSource = true;

        if (this.paused) {
            this.emitPause();
        } else {
            this.emitPlay();
        }
    }

    async releaseAsVideoSource() {
        this.disableAutoPlayback();
        this.videoElt.ontimeupdate = null;
        this.videoElt.ondurationchange = null;

        this.controller.removeAllListeners();
        this.controller.stop();

        this._isVideoSource = false;
    }

    private currentSegment: Segment = null!;

    async goToTimecode(timecode: number) {
        const { segment, offset } = await this.segments.getSegmentAtTimecode(timecode);

        this.logger.log(`Requesting segment for ${timecode.toFixed(2)}`);

        await this.renderSegment(segment, offset);
    }

    private async renderSegment(segment: Segment, offset: number) {
        let segmentChanged = false;

        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            const response = await fetch(segment.url);
            const url = URL.createObjectURL(await response.blob());

            this.videoElt.src = url;
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

    private tryGetActiveVideoDuration() {
        const duration = this.videoElt.duration;

        return isNaN(duration) || duration == Number.POSITIVE_INFINITY ? -1 : duration;
    }

    private async playNextSegment() {
        this.assertAutoPlaybackIsEnabled();

        const nextSegment = this.segments.getNextSegment(this.currentSegment);

        if (nextSegment) {
            this.logger.log(`Playing next ${formatSegment(nextSegment)}`);
            await this.renderSegment(nextSegment, 0);
            await this.play();
        } else {
            this.logger.info('No next segment available');
            await this.pause();
            this.emitEnded('end');
        }
    }

    private enableAutoPlayNextSegmet() {
        this.videoElt.onended = () => this.playNextSegment();
    }

    private disableAutoPlayback() {
        this.videoElt.onended = null;
    }

    async goToStart() {
        await this.goToTimecode(0);
    }

    async goToEnd() {
        const segment = this.segments.lastSegment;

        await this.renderSegment(segment, segment.duration);
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
            this.logger.info(`Can't fast fowrard. At playback end`);
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
            this.segments.isFirstSegment(this.currentSegment) && this.videoElt.currentTime === 0
        );
    }

    public get isAtEnd() {
        return Boolean(
            this.segments.isLastSegment(this.currentSegment) &&
                this.videoElt.currentTime === this.videoElt.duration
        );
    }

    private assertAutoPlaybackIsEnabled() {
        if (!this.videoElt.onended) {
            throw new Error(`This function is meant to be used as part of auto playback.`);
        }
    }

    private assertIsActiveVideoSource() {
        if (!this._isVideoSource) {
            throw new Error(
                `This is only available when playback the active source on the video element`
            );
        }
    }

    private assertHasSegments() {
        if (this._segments.isEmpty) {
            // The SegmentPlayback class is trying to access the segments
            // collection when it's empty. This suggests a switch from
            // recording to playback is happening and force rendering the
            // video data failed along the way.
            throw new Error(`Playback has no segments to work with.`);
        }
    }

    private emitSegmentRendered(segment: Segment) {
        this.emit('segmentrendered', segment);
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.currentTime, this.controller.speed);
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
