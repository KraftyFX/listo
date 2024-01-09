import { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { PlaybackOptions } from '~/renderer/media';
import { DEFAULT_PLAYBACK_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { formatSegment } from '~/renderer/media/segments/formatutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { getLocator } from '~/renderer/services';
import { isMediaDecodingError } from '~/renderer/services/errorutil';
import TypedEventEmitter from '../eventemitter';
import { Segment } from '../segments/interfaces';
import { Scrubber } from './scrubber';

type SegmentPlaybackEvents = {
    segmentrendered: (segment: Segment) => void;

    play: () => void;
    pause: () => void;
    ended: (where: 'start' | 'end') => void;

    timeupdate: (currentTime: Dayjs, speed: number) => void;
    error: (segment: Segment, err: any, handled: boolean) => void;
};

export class Playback extends (EventEmitter as new () => TypedEventEmitter<SegmentPlaybackEvents>) {
    private logger: Logger;
    private scrubber: Scrubber;
    public readonly options: PlaybackOptions;
    private readonly _segments: SegmentCollection;

    constructor(segments: SegmentCollection, options?: Partial<PlaybackOptions>) {
        super();

        this._segments = segments;
        this.options = _merge({}, DEFAULT_PLAYBACK_OPTIONS, options);

        this.logger = getLog('pbk', this.options);
        this.scrubber = new Scrubber(this, this.options);
    }

    private get player() {
        const { player } = getLocator();

        return player;
    }

    get segments() {
        this.assertHasSegments();

        return this._segments;
    }

    get speed() {
        return this.scrubber.speed;
    }

    get currentTime() {
        this.assertIsActiveVideoSource();

        if (this.isLostInTime()) {
            this.logger.warn(`Shit. We don't know when we are. Compensating...`);
            return this.currentSegment.startTime;
        } else {
            return this.currentSegment.startTime.add(this.player.currentTime, 'seconds');
        }
    }

    private _isVideoSource = false;

    public get isVideoSource() {
        return this._isVideoSource;
    }

    async setAsVideoSource(time: Dayjs) {
        if (!this._isVideoSource) {
            this._isVideoSource = true;

            this.assertHasSegments();

            await this.goToTime(time);

            this.player.ontimeupdate = () => this.emitTimeUpdate();
            this.player.ondurationchange = () => this.syncSegmentDuration(this.currentSegment);
            this.player.onerror = (err) => this.onError(err);

            this.scrubber.on('ended', (where: 'start' | 'end') => this.emitEnded(where));
            this.scrubber.on('play', () => this.emitPlay());
            this.scrubber.on('pause', () => this.emitPause());

            if (this.paused) {
                this.emitPause();
            } else {
                this.emitPlay();
            }
        }
    }

    async releaseAsVideoSource() {
        if (this._isVideoSource) {
            this.disableAutoPlayback();
            this.player.ontimeupdate = null;
            this.player.ondurationchange = null;
            this.player.onerror = null;
            await this.player.setVideoSource(null);

            this.scrubber.removeAllListeners();
            this.scrubber.stop();

            this.currentSegment = null!;
            this._isVideoSource = false;
        }
    }

    private currentSegment: Segment = null!;

    async goToTime(time: Dayjs) {
        const { segment, offset } = await this.segments.getSegmentAtTime(time);

        this.logger.log(`Requesting segment for ${this.segments.getAsTimecode(time)}`);

        await this.renderSegment(segment, offset);
    }

    private _isBusy = false;

    get isBusyDontTouchThePlayback() {
        return this._isBusy;
    }

    private async renderSegment(segment: Segment, offset: number) {
        this._isBusy = true;

        let segmentChanged = false;

        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            await this.player.setVideoSource(await this.getSegmentUrl(segment));

            this.logger.log(`Rendering ${formatSegment(segment)}, offset=${offset.toFixed(2)}`);

            segmentChanged = true;
        }

        this.syncSegmentDuration(this.currentSegment);
        this.player.currentTime = offset;

        if (segmentChanged) {
            this.emitSegmentRendered(segment);
        }

        this._isBusy = false;
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
        const duration = this.player.duration;

        return isNaN(duration) || duration == Number.POSITIVE_INFINITY ? -1 : duration;
    }

    private async onError(err: any) {
        let handled = false;
        const { index } = this.currentSegment;

        if (isMediaDecodingError(err)) {
            handled = true;
            console.warn(`Decoding error on segment ${index}. Compensating.`);

            const next = this.currentTime.add(this.options.decodingErrorSkipSec, 'second');

            await this.releaseAsVideoSource();
            await this.setAsVideoSource(next);

            // TODO: Preserve playback speed?
            await this.play();
        } else {
            console.error(`Segment ${index} had an unreognized error`);
        }

        this.currentSegment.hasErrors = true;
        this.emitError(this.currentSegment, err, handled);
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
        this.player.onended = () => this.playNextSegment();
    }

    private disableAutoPlayback() {
        this.player.onended = null;
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
        return this.scrubber.paused;
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
            await this.scrubber.play();
        }
    }

    async pause() {
        this.disableAutoPlayback();
        await this.scrubber.pause();
    }

    get isAtMaxRewindSpeed() {
        return this.scrubber.isAtMaxRewindSpeed;
    }

    async rewind() {
        if (this.isAtBeginning) {
            this.logger.info(`Can't rewind. At playback start`);
            return;
        }

        this.disableAutoPlayback();
        await this.scrubber.rewind();
    }

    get isAtMinSlowSpeed() {
        return this.scrubber.isAtMinSlowSpeed;
    }

    async slowForward() {
        if (this.isAtEnd) {
            this.logger.info(`Cant slow forward. At playback end`);
            return;
        }

        this.disableAutoPlayback();
        await this.scrubber.slowForward();
    }

    get isAtMaxFastForwardSpeed() {
        return this.scrubber.isAtMaxFastForwardSpeed;
    }

    async fastForward() {
        if (this.isAtEnd) {
            this.logger.info(`Can't fast fowrard. At playback end`);
            return;
        }

        this.disableAutoPlayback();
        await this.scrubber.fastForward();
    }

    async nextFrame() {
        if (this.isAtEnd) {
            this.logger.info('At playback end');
            return;
        }

        this.disableAutoPlayback();
        await this.scrubber.nextFrame();
    }

    get isAtBeginning() {
        this.assertIsActiveVideoSource();
        this.assertHasSegments();

        return Boolean(
            this.segments.isFirstSegment(this.currentSegment) && this.player.currentTime === 0
        );
    }

    get isAtEnd() {
        this.assertIsActiveVideoSource();
        this.assertHasSegments();

        return Boolean(
            this.segments.isLastSegment(this.currentSegment) && this.isAtCurrentSegmentEnd
        );
    }

    private get isAtCurrentSegmentEnd() {
        return Boolean(this.player.currentTime === this.player.duration);
    }

    private isLostInTime() {
        return this.player.currentTime > 0 && this.player.duration === Number.POSITIVE_INFINITY;
    }

    private assertAutoPlaybackIsEnabled() {
        if (!this.player.onended) {
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

    private emitError(segment: Segment, err: any, handled: boolean) {
        this.emit('error', segment, err, handled);
    }
}
