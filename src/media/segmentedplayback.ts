import EventEmitter from 'events';
import { Segment, printSegment } from './chunkedrecorder';
import { DEFAULT_PLAYBACK_OPTIONS } from './constants';
import { PlaybackOptions } from './dvrconfig';
import { PlaybackController } from './playbackcontroller';
import { SegmentCollection } from './segmentcollection';

export class SegmentedPlayback extends EventEmitter {
    private controller: PlaybackController;
    public readonly options: PlaybackOptions;
    private _segments: SegmentCollection | null;

    constructor(public readonly videoElt: HTMLMediaElement, opt?: PlaybackOptions) {
        super();
        this.options = Object.assign({}, DEFAULT_PLAYBACK_OPTIONS, opt);

        this.controller = new PlaybackController(this, this.options);
        this._segments = null;
    }

    get segments() {
        if (!this._segments) {
            throw new Error(
                `The segments array for the playback has not been set. This happens during setAsVideoSource.`
            );
        }

        return this._segments!;
    }

    get currentTime() {
        return this.currentSegment!.startTime + this.videoElt.currentTime;
    }

    get duration() {
        return this.segments.duration;
    }

    async setAsVideoSource(segments: SegmentCollection, timestamp: number) {
        this.replaceActiveSegments(segments, timestamp);

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

    async replaceActiveSegments(segments: SegmentCollection, timestamp: number) {
        this._segments = segments;

        await this.renderSegmentAtTime(timestamp);
    }

    async releaseAsVideoSource() {
        this._segments = null;
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

        this.log(`Requesting segment at ${timestamp.toFixed(2)}`);

        this.renderSegment(segment, offset);
    }

    private renderSegment(segment: Segment, offset: number) {
        let segmentChanged = false;

        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            this.videoElt.src = segment.url;
            this.videoElt.srcObject = null;

            this.log(`Rendering ${printSegment(segment)}, offset=${offset.toFixed(2)}`);

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
            this.log(`Playing next segment ${printSegment(nextSegment)}`);
            this.renderSegment(nextSegment, 0);
            this.play();
        } else {
            this.info('No next segment available to play paused=' + this.controller.paused);
            this.pause().then(() => this.emitEnded('end'));
        }
    }

    private assertAutoPlaybackIsEnabled() {
        if (!this.videoElt.onended) {
            throw new Error(`This function is meant to be used as part of auto playback.`);
        }
    }

    private enableAutoPlayNextSegmet() {
        this.videoElt.onended = () => {
            this.info('Reached the end of current segment');
            this.playNextSegment();
        };
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
            this.info(`Can't play. At playback end`);
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
            this.info(`Can't rewind. At playback start`);
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
            this.info(`Cant slow forward. At playback end`);
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
            this.info(`Can't fast fowrardAt playback end`);
            return;
        }

        this.disableAutoPlayback();
        await this.controller.fastForward();
    }

    async nextFrame() {
        if (this.isAtEnd) {
            this.info('At playback end');
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

    private info(message: string) {
        if (this.options.logging === 'info' || this.options.logging === 'log') {
            console.info(message);
        }
    }

    private log(message: string) {
        if (this.options.logging === 'log') {
            console.log(message);
        }
    }
}
