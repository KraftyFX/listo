import { Dayjs } from 'dayjs';
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

type SegmentPlaybackEvents = {
    segmentrendered: (segment: Segment) => void;

    play: () => void;
    pause: () => void;
    ended: (where: 'start' | 'end') => void;
    timeupdate: (currentTime: Dayjs, speed: number) => void;
};

export class SegmentPlayback extends (EventEmitter as new () => TypedEventEmitter<SegmentPlaybackEvents>) {
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

    get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get speed() {
        return this.controller.speed;
    }

    get currentTime() {
        this.assertIsActiveVideoSource();

        if (this.isLostInTime()) {
            this.logger.warn(`Shit. We don't know when we are. Compensating...`);
            return this.currentSegment.startTime;
        } else {
            return this.currentSegment.startTime.add(this.videoElt.currentTime, 'seconds');
        }
    }

    private _isVideoSource = false;

    async setAsVideoSource(time: Dayjs) {
        this.assertHasSegments();

        await this.goToTime(time);

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

        this.currentSegment = null!;
        this._isVideoSource = false;
    }

    private currentSegment: Segment = null!;

    async goToTime(time: Dayjs) {
        const { segment, offset } = await this.segments.getSegmentAtTime(time);

        this.logger.log(`Requesting segment for ${this.segments.getAsTimecode(time)}`);

        await this.renderSegment(segment, offset);
    }

    private async renderSegment(segment: Segment, offset: number) {
        let segmentChanged = false;

        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            this.videoElt.srcObject = null;
            this.videoElt.src = await this.getSegmentUrl(segment);

            this.logger.log(`Rendering ${formatSegment(segment)}, offset=${offset.toFixed(2)}`);

            segmentChanged = true;
        }

        this.syncSegmentDuration(this.currentSegment);
        this.videoElt.currentTime = offset;

        if (segmentChanged) {
            this.emitSegmentRendered(segment);
        }
    }

    private async getSegmentUrl(segment: Segment) {
        if (segment.url.startsWith('listo://')) {
            const response = await fetch(segment.url);
            const url = URL.createObjectURL(await response.blob());

            return url;
        } else {
            return segment.url;
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

    isBeforeStart(time: Dayjs) {
        this.assertHasSegments();

        return time.isBefore(this.segments.firstSegmentStartTime);
    }

    async goToStart() {
        this.assertHasSegments();

        await this.goToTime(this.segments.firstSegmentStartTime);
    }

    isAfterEnd(time: Dayjs) {
        this.assertHasSegments();

        return time.isAfter(this.segments.lastSegmentEndTime);
    }

    async goToEnd() {
        this.assertHasSegments();

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

        if (this.isAtCurrentSegmentEnd) {
            this.logger.info('At the end of currentSegment. Starting play at the next one.');
            await this.playNextSegment();
        } else {
            await this.controller.play();
        }
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

    get isAtBeginning() {
        this.assertHasSegments();

        return Boolean(
            this.segments.isFirstSegment(this.currentSegment) && this.videoElt.currentTime === 0
        );
    }

    get isAtEnd() {
        this.assertHasSegments();

        return Boolean(
            this.segments.isLastSegment(this.currentSegment) && this.isAtCurrentSegmentEnd
        );
    }

    private get isAtCurrentSegmentEnd() {
        return Boolean(this.videoElt.currentTime === this.videoElt.duration);
    }

    private isLostInTime() {
        return this.videoElt.currentTime > 0 && this.videoElt.duration === Number.POSITIVE_INFINITY;
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
        this.emit('timeupdate', this.currentTime, this.speed);
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
