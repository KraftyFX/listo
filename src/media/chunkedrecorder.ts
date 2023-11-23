import { nowAsSeconds } from "./dateutil";
import { RecordOptions } from "./dvrconfig";
import { LiveStreamRecorder } from "./livestreamrecorder";
import { SegmentCollection } from "./segmentcollection";

const mimeType = 'video/webm';
const MIN_SEGMENT_DURATION_SEC = 5;

export interface Segment {
    index: number;
    url: string;
    chunks: Blob[];
    startTime: number;
    duration: number;
}

export function printSegment(segment:Segment) {
    return `segment=${segment.index}, start=${segment.startTime.toFixed(2)}, duration=${segment.duration.toFixed(2)}`
}

export class ChunkedRecorder
{
    private readonly recorder:  MediaRecorder;

    constructor(
        private readonly liveStream: LiveStreamRecorder,
        public readonly options: RecordOptions
    ) {
        this.liveStream = liveStream;

        this.recorder = new MediaRecorder(this.liveStream.stream, { mimeType });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private segments: Segment[] = [];
    private interval: any;

    start() {
        const segment:Segment = {
            index: this.segments.length,
            url: "",
            startTime: this.segments.length == 0 ? 0 : this.currentTime,
            duration: 0,
            chunks: []
        };

        this.segments.push(segment);

        this.recorder.start();

        if (!this.interval) {
            this.interval = setInterval(() => {
                this.recorder.stop();
            }, MIN_SEGMENT_DURATION_SEC * 1000);
        }
    }

    async stop() {
        clearInterval(this.interval);
        this.interval = 0;

        this.recorder.stop();
    }

    private onDataAvailable = (event: BlobEvent) => {
        if (this.segments.length === 1) {
            this._recordStartTime = nowAsSeconds(this.liveStream.videoElt.currentTime);
        }

        this.saveDataBlob(event.data);

        this.finalizeSegment();
        this.start();

        this.resolveForceRenderDonePromise();
    }

    private saveDataBlob(blob: Blob) {
        if (typeof blob === "undefined" || blob.size === 0) {
            return;
        }

        this.activeSegment.chunks.push(blob);
    }

    private finalizeSegment() {
        const segment = this.activeSegment;

        const blob = new Blob(segment.chunks, { type: mimeType });

        segment.url = URL.createObjectURL(blob);
        segment.duration = this.activeSegmentDuration;

        this.log(`Finalizing segment ${printSegment(segment)}`)
    }

    async getRecordedSegments() {
        await this.ensureHasSegmentToRender();

        const segments = this.segments.filter(s => s.duration > 0);

        return new SegmentCollection(this, segments);
    }

    get renderableSegmentCount() {
        if (this.segments.length < 2) {
            return 0;
        } else {
            return this.segments.length - 2;
        }
    }

    private get activeSegment() {
        return this.segments[this.segments.length - 1];
    }

    private get activeSegmentDuration() {
        return this.currentTime - this.activeSegment.startTime;
    }

    private _recordStartTime:Date;

    private get currentTime() {
        return (new Date().valueOf() - this._recordStartTime.valueOf()) / 1000;
    }

    private forcedRenderDone: (hadToRender: boolean) => void;

    ensureHasSegmentToRender() {
        if (this.segments.length === 1) {
            return new Promise<boolean>(resolve => {
                this.log('Forcing segment rendering');
                this.forcedRenderDone = resolve;
                this.stop();
            })
        } else {
            return Promise.resolve(false);
        }
    }

    private resolveForceRenderDonePromise() {
        if (this.forcedRenderDone) {
            this.assertHasSegmentToRender();

            this.forcedRenderDone(true);
            this.forcedRenderDone = null;
        }
    }

    private assertHasSegmentToRender() {
        if (this.segments.length <= 1) {
            throw new Error(`The chunked recorder was told to force render a frame. It did that but the segments array is somehow empty.`);
        }
    }

    resetSegmentDuration(segment:Segment, duration:number) {
        if (segment.duration === duration) {
            return false;
        }

        this.log(`Resetting segment ${printSegment(segment)} from ${segment.duration.toFixed(3)} to ${duration.toFixed(3)}`);
        segment.duration = duration;

        let prev = this.segments[0];

        this.segments.forEach(curr => {
            if (curr.index == 0) {
                return;
            }

            curr.startTime = prev.startTime + prev.duration + 0.0001;

            prev = curr;
        });

        return true;
    }

    private log(message: string) {
        console.log(message);
    }
}
