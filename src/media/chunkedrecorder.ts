import { DEFAULT_RECORDING_OPTIONS } from "./constants";
import { nowAsSeconds } from "./dateutil";
import { RecordingOptions } from "./dvrconfig";
import { LiveStreamRecorder } from "./livestreamrecorder";
import { SegmentCollection } from "./segmentcollection";


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
    public readonly options: RecordingOptions;

    constructor(
        private readonly liveStream: LiveStreamRecorder,
        opt?: Partial<RecordingOptions>
    ) {
        this.liveStream = liveStream;
        this.options = Object.assign({}, DEFAULT_RECORDING_OPTIONS, opt);

        this.recorder = new MediaRecorder(this.liveStream.stream, { mimeType: this.options.mimeType });
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
            }, this.options.minSegmentSizeInSec * 1000);
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

        const blob = new Blob(segment.chunks, { type: this.options.mimeType });

        segment.url = URL.createObjectURL(blob);
        segment.duration = this.activeSegmentDuration;

        this.info(`Finalizing segment ${printSegment(segment)}`)
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
                this.info('Forcing segment rendering');
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

        this.info(`Resetting segment ${printSegment(segment)} from ${segment.duration.toFixed(3)} to ${duration.toFixed(3)}`);
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
