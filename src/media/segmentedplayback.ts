import EventEmitter from "events";
import { Segment, printSegment } from "./chunkedrecorder";
import { PlaybackController } from "./playbackcontroller";
import { SegmentCollection } from "./segmentcollection";

export class SegmentedPlayback extends EventEmitter
{
    private controller:PlaybackController;

    constructor(public readonly videoElt: HTMLMediaElement, public readonly segments: SegmentCollection) {
        super();
        
        this.controller = new PlaybackController(this);
    }

    get currentTime() { 
        return this.currentSegment.startTime + this.videoElt.currentTime;
    }

    get duration() { return this.segments.duration; }

    async setAsVideoSource(timestamp:number) {
        await this.renderSegmentAtTime(timestamp);

        this.videoElt.onended = () => this.playNextSegment();
        this.videoElt.ondurationchange = () => this.syncSegmentDuration(this.currentSegment);

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
        this.videoElt.ondurationchange = null;

        this.controller.removeAllListeners();
        this.controller.stop();
    }

    private currentSegment:Segment;
    
    private async renderSegmentAtTime(timestamp:number) {
        const { segment, offset } = await this.segments.getSegmentAtTime(timestamp);

        this.log(`Requesting segment at ${timestamp.toFixed(2)}`);

        this.renderSegment(segment, offset);
    }

    private renderSegment(segment:Segment, offset:number) {
        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            this.videoElt.src = segment.url;
            this.videoElt.srcObject = null;

            this.info(`Rendering ${printSegment(segment)}, offset=${offset.toFixed(2)}`);
        }

        this.syncSegmentDuration(this.currentSegment);
        this.videoElt.currentTime = offset;
    }

    private syncSegmentDuration(segment: Segment) {
        const duration = this.tryGetActiveVideoDuration();

        if (duration !== -1 && segment.duration !== duration) {
            this.segments.resetSegmentDuration(segment, duration);
            this.emitTimeUpdate();
        }
    }

    tryGetActiveVideoDuration() {
        const duration = this.videoElt.duration;

        return (isNaN(duration) || duration == Number.POSITIVE_INFINITY) ? -1 : duration;
    }

    private playNextSegment() {
        if (this.controller.isActive) {
            return;
        }

        const nextSegment = this.segments.getNextSegment(this.currentSegment);

        if (nextSegment) {
            this.renderSegment(nextSegment, 0);
            this.play();
        } else {
            this.emitEnded();
        }
    }

    async goToTimecode(timecode:number) {
        await this.renderSegmentAtTime(timecode);
    }

    get paused() { return this.controller.paused; }

    async play() {
        await this.controller.play();
    }

    async pause() {
        await this.controller.pause();
    }

    async rewind() {
        await this.controller.rewind();
    }

    async slowForward() {
        await this.controller.slowForward();
    }

    async fastForward() {
        await this.controller.fastForward();
    }

    async nextFrame() {
        await this.controller.nextFrame();
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.currentTime, this.duration, this.controller.multiplier);
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
        console.info(message);
    }

    private log(message: string) {
        // console.log(message);
    }
}