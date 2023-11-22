import { nowAsSeconds } from "./dateutil";
import { LiveStream } from "./livestream";

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
    private liveStream: LiveStream;
    private recorder:  MediaRecorder;
    public segments: Segment[] = [];

    constructor(liveStream: LiveStream) {
        this.liveStream = liveStream;
    }

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

        this.recorder = new MediaRecorder(this.liveStream.stream, { mimeType });
        this.recorder.ondataavailable = this.onDataAvailable;
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
            this._startedAt = nowAsSeconds(this.liveStream.videoElt.currentTime);
        }

        this.saveDataBlob(event.data);

        this.finalizeSegment();
        this.start();

        if (this.hasSegmentToRenderDone) {
            this.hasSegmentToRenderDone(true);
            this.hasSegmentToRenderDone = null;
        }
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

        this._recordedDuration += segment.duration;

        this.log(`Finalizing segment ${printSegment(segment)}`)
    }

    async getSegmentAtTime(timestamp: number) {
        const assertCorrectSegmentWasFound = (segment: Segment) => {
            if (!segment) {
                throw new Error(`The timestamp ${timestamp} is in the bounds of this chunked recording ${this.recordedDuration} but a segment was not found. This likely means the segments array is corrupt.`);
            }

            if (!(segment.startTime <= timestamp && timestamp <= (segment.startTime + segment.duration))) {
                throw new Error(`The wrong segment was found`);
            }
        }

        if (await this.ensureHasSegmentToRender()) {
            this.log('Segment was force rendered.');
        }

        const segments = this.segments;

        if (timestamp <= 0) {
            const segment = segments[0];
            this.log(`Min ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);
            return { segment, offset : 0 };
        } else if (timestamp >= this.recordedDuration) {
            const segment = segments[segments.length - 2];
            this.log(`Max ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);
            return { segment, offset : segment.startTime + segment.duration };
        } else {
            const segment = segments.find(segment => timestamp < segment.startTime + segment.duration);

            assertCorrectSegmentWasFound(segment);

            this.log(`Mid ${segment.index} = ${segment.startTime} <= ${timestamp} <= ${segment.startTime + segment.duration}`);

            const offset = Math.max(0, timestamp - segment.startTime);

            return { segment, offset };
        }
    }

    getNextSegment(segment: Segment) {
        if (segment.index >= this.segments.length - 2) {
            return null;
        } else {
            return this.segments[segment.index + 1];
        }
    }

    get renderableSegmentCount() {
        if (this.segments.length < 2) {
            return 0;
        } else {
            return this.segments.length - 2;
        }
    }

    private _recordedDuration = 0;
    get recordedDuration() { return this._recordedDuration; }

    private get activeSegment() {
        return this.segments[this.segments.length - 1];
    }

    private get activeSegmentDuration() {
        return this.currentTime - this.activeSegment.startTime;
    }

    private _startedAt:Date;

    private get currentTime() {
        return (new Date().valueOf() - this._startedAt.valueOf()) / 1000;
    }

    private hasSegmentToRenderDone: (hadToRender: boolean) => void;

    ensureHasSegmentToRender() {
        if (this.segments.length === 1) {
            return new Promise<boolean>(resolve => {
                this.log('Forcing segment rendering');
                this.hasSegmentToRenderDone = resolve;
                this.recorder.ondataavailable = this.onDataAvailable;
                this.stop();
            })
        } else {
            return Promise.resolve(false);
        }
    }

    resetSegmentDuration(segment:Segment, duration:number) {
        if (duration == -1 || segment.duration === duration) {
            return;
        }

        this.log(`Resetting segment ${printSegment(segment)}`)
        segment.duration = duration;

        let prev = this.segments[0];

        this.segments.forEach(curr => {
            if (curr.index == 0) {
                return;
            }

            curr.startTime = prev.startTime + prev.duration + 0.0001;

            prev = curr;
        });

        this._recordedDuration = prev.startTime + prev.duration;
    }
    
    private log(message: string) {
        // console.log(message);
    }

}