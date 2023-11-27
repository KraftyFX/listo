import EventEmitter from 'events';
import { Segment, printSegment } from './chunkedrecorder';
import { DEFAULT_PLAYBACK_OPTIONS } from './constants';
import { PlaybackOptions } from './dvrconfig';
import { PlaybackController } from './playbackcontroller';
import { SegmentCollection } from './segmentcollection';

export class SegmentedPlayback extends EventEmitter {
    private controller: PlaybackController;
    public readonly options: PlaybackOptions;

    constructor(
        public readonly videoElt: HTMLMediaElement,
        public readonly segments: SegmentCollection,
        opt?: PlaybackOptions
    ) {
        super();
        this.options = Object.assign({}, DEFAULT_PLAYBACK_OPTIONS, opt);

        this.controller = new PlaybackController(this, this.options);
    }

    get currentTime() {
        return this.currentSegment!.startTime + this.videoElt.currentTime;
    }

    get duration() {
        return this.segments.duration;
    }

    async setAsVideoSource(timestamp: number) {
        await this.renderSegmentAtTime(timestamp);

        this.videoElt.onended = () => this.playNextSegment();
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
        this.videoElt.ondurationchange = () => this.syncSegmentDuration(this.currentSegment!);

        this.controller.on('timeupdate', (timestamp) => this.renderSegmentAtTime(timestamp));
        this.controller.on('rewindstartreached', () => this.emitRewindStartReached());
        this.controller.on('ended', () => this.emitEnded());
        this.controller.on('play', () => this.emitPlay());
        this.controller.on('pause', () => this.emitPause());

        if (this.videoElt.paused) {
            this.emitPause();
        } else {
            this.emitPlay();
        }
    }

    async releaseAsVideoSource() {
        this.currentSegment = null;

        this.videoElt.onended = null;
        this.videoElt.ontimeupdate = null;
        this.videoElt.ondurationchange = null;

        this.controller.removeAllListeners();
        this.controller.stop();
    }

    private currentSegment: Segment | null = null;

    private async renderSegmentAtTime(timestamp: number) {
        const { segment, offset } = await this.segments.getSegmentAtTime(timestamp);

        this.info(`Requesting segment at ${timestamp.toFixed(2)}`);

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
        if (this.controller.isActive) {
            return;
        }

        const nextSegment = this.segments.getNextSegment(this.currentSegment!);

        if (nextSegment) {
            this.log(`Playing next segment ${printSegment(nextSegment)}`);
            this.renderSegment(nextSegment, 0);
            this.play();
        } else {
            this.info('No next segment available to play');
            this.emitEnded();
        }
    }

    async goToTimecode(timecode: number) {
        await this.renderSegmentAtTime(timecode);
    }

    get paused() {
        return this.controller.paused;
    }

    async play() {
        await this.controller.play();
    }

    async pause() {
        await this.controller.pause();
    }

    async rewind() {
        if (this.isAtBeginning()) {
            this.info('At playback start');
            return;
        }

        await this.controller.rewind();
    }

    async slowForward() {
        if (this.isAtEnd()) {
            this.info('At playback end');
            return;
        }

        await this.controller.slowForward();
    }

    async fastForward() {
        if (this.isAtEnd()) {
            this.info('At playback end');
            return;
        }

        await this.controller.fastForward();
    }

    async nextFrame() {
        if (this.isAtEnd()) {
            this.info('At playback end');
            return;
        }

        await this.controller.nextFrame();
    }

    private isAtBeginning() {
        return this.segments.isFirstSegment(this.currentSegment) && this.videoElt.currentTime === 0;
    }

    private isAtEnd() {
        return (
            this.segments.isLastSegment(this.currentSegment) &&
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

    private emitEnded() {
        this.emit('ended');
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
