import EventEmitter from "events";
import { ChunkedRecorder, Segment, printSegment } from "./chunkedrecorder";
import { LiveStream } from "./livestream";
import { PlaybackController } from "./playbackcontroller";

export class LiveStreamRecorder extends EventEmitter
{
    private liveStream:LiveStream;
    private controller:PlaybackController;
    private chunkedRecorder:ChunkedRecorder;

    constructor(liveStream:LiveStream) {
        super();
        
        this.liveStream = liveStream;
        this.controller = new PlaybackController(this);
        this.chunkedRecorder = new ChunkedRecorder(this.liveStream);
    }

    async startRecording() {
        await this.chunkedRecorder.start();
    }

    async stop() {
        await this.controller.stop();
        await this.chunkedRecorder.stop();
    }

    public get videoElt() { return this.liveStream.videoElt; }

    get currentTime() { 
        return this.currentSegment.startTime + this.videoElt.currentTime;
    }

    get duration() { return this._duration; }
    private _duration = 0;

    tryGetActiveVideoDuration() {
        const duration = this.videoElt.duration;

        return (isNaN(duration) || duration == Number.POSITIVE_INFINITY) ? -1 : duration;
    }

    async setAsVideoSource(timestamp:number) {
        this._duration = this.liveStream.duration;

        this.videoElt.onended = () => this.playNextSegment();

        this.controller.on('rewindstartreached', () => this.emitRewindStartReached());
        this.controller.on('fastforwardendreached', () => this.emitForwardEndReached());

        await this.renderSegmentAtTime(timestamp);
    }

    async releaseAsVideoSource() {
        this.currentSegment = null;
        this._duration = 0;

        this.videoElt.onended = null;
        this.videoElt.ontimeupdate = null;

        this.controller.removeAllListeners();

        await this.controller.stop();
    }

    private currentSegment:Segment;
    
    private async renderSegmentAtTime(timestamp:number) {
        const { segment, offset } = await this.chunkedRecorder.getSegmentAtTime(timestamp);

        this.log(`Requesting segment at ${timestamp.toFixed(2)}`);

        this.renderSegment(segment, offset);
    }

    private info(message: string) {
        console.info(message);
    }

    private log(message: string) {
        // console.log(message);
    }

    private renderSegment(segment:Segment, offset:number) {
        if (this.currentSegment !== segment) {
            this.currentSegment = segment;

            this.videoElt.src = segment.url;
            this.videoElt.srcObject = null;

            this.videoElt.ontimeupdate = () => {
                this.chunkedRecorder.resetSegmentDuration(this.currentSegment, this.tryGetActiveVideoDuration());
                this.emitTimeUpdate();
            };
    
            this.controller.on('timeupdate', (timestamp) => {
                this.renderSegmentAtTime(timestamp);
            });

            this.info(`Rendering ${printSegment(segment)}, offset=${offset.toFixed(2)}`);
        }

        this.videoElt.currentTime = offset;
    }

    private playNextSegment() {
        if (this.controller.isActive) {
            return;
        }

        const nextSegment = this.chunkedRecorder.getNextSegment(this.currentSegment);

        if (nextSegment && nextSegment.startTime < this.duration) {
            this.renderSegment(nextSegment, 0);
            this.play();
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
        await this.chunkedRecorder.ensureHasSegmentToRender();
        await this.controller.rewind();
    }

    async slowForward() {
        await this.chunkedRecorder.ensureHasSegmentToRender();
        await this.controller.slowForward();
    }

    async fastForward() {
        await this.chunkedRecorder.ensureHasSegmentToRender();
        await this.controller.fastForward();
    }

    async nextFrame() {
        await this.chunkedRecorder.ensureHasSegmentToRender();
        await this.controller.nextFrame();
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.currentTime, this.duration, this.controller.multiplier);
    }

    private emitRewindStartReached() {
        this.emit('rewindstartreached');
    }

    private emitForwardEndReached() {
        this.emit('forwardendreached');
    }
}