import EventEmitter from 'events';
import { DEFAULT_RECORDING_OPTIONS } from './constants';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { RecordingOptions } from './dvrconfig';
import { LiveStreamRecorder } from './livestreamrecorder';
import { SegmentCollection } from './segmentcollection';

export interface Segment {
    index: number;
    url: string;
    chunks: Blob[];
    startTime: number;
    duration: number;
}

export function printSegment(segment: Segment) {
    return `segment=${segment.index}, start=${segment.startTime.toFixed(
        2
    )}, duration=${segment.duration.toFixed(2)}`;
}

export class ChunkedRecorder extends EventEmitter {
    private readonly recorder: MediaRecorder;
    public readonly options: RecordingOptions;

    constructor(private readonly liveStream: LiveStreamRecorder, opt?: Partial<RecordingOptions>) {
        super();

        this.liveStream = liveStream;
        this.options = Object.assign({}, DEFAULT_RECORDING_OPTIONS, opt);

        this.recorder = new MediaRecorder(this.liveStream.stream, {
            mimeType: this.options.mimeType,
        });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private _segments = new SegmentCollection();
    private interval: any;

    start() {
        const segment: Segment = {
            index: this._segments.length,
            url: '',
            startTime: this._segments.length == 0 ? 0 : this.currentTime,
            duration: 0,
            chunks: [],
        };

        this._segments.addSegment(segment);

        try {
            this.recorder.start();
            if (!this.interval) {
                this.interval = setInterval(() => {
                    this.recorder.stop();
                }, this.options.minSegmentSizeInSec * 1000);
            }
        } catch (err) {
            this.emit('recordingerror', err);
        }
    }

    async stop() {
        clearInterval(this.interval);
        this.interval = 0;

        this.recorder.stop();
    }

    private onDataAvailable = (event: BlobEvent) => {
        this.acquireAccurateRecordingStartTime();

        this.finalizeActiveSegment(event.data);
        this.start();

        this.resolveForceRenderDonePromise();
    };

    private acquireAccurateRecordingStartTime() {
        if (!this._segments.hasRecordingStartTime) {
            this._segments.recordingStartTime = subtractSecondsFromNow(
                this.liveStream.videoElt.currentTime
            );
        }
    }

    private finalizeActiveSegment(blob: Blob) {
        const segment = this.activeSegmentBeingRecorded;

        segment.chunks.push(blob);

        const blobs = new Blob(segment.chunks, { type: this.options.mimeType });
        const url = URL.createObjectURL(blobs);
        const duration = this.estimatedDurationOfActiveSegment;

        this._segments.finalizeSegment(segment, url, duration);
    }

    async getRecordedSegments() {
        await this.ensureHasSegmentToRender();

        return this._segments;
    }

    private get activeSegmentBeingRecorded() {
        return this._segments.lastSegment;
    }

    private get estimatedDurationOfActiveSegment() {
        return this.currentTime - this.activeSegmentBeingRecorded.startTime;
    }

    private get currentTime() {
        if (!this._segments.hasRecordingStartTime) {
            throw new Error(
                `The current time is only available after onDataAvailable is called ` +
                    `at least once and an acurate start time is acquired. Make sure you're ` +
                    `accessing this property after that point.`
            );
        }

        return secondsSince(this._segments.recordingStartTime);
    }

    private forcedRenderDone: ((hadToRender: boolean) => void) | null = null;

    ensureHasSegmentToRender() {
        if (this._segments.length === 1) {
            return new Promise<boolean>((resolve) => {
                this.info('Forcing segment rendering');
                this.forcedRenderDone = resolve;
                this.stop();
            });
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
        if (this._segments.length <= 1) {
            throw new Error(
                `The chunked recorder was told to force render a segment. It did that but the segments array is somehow empty.`
            );
        }
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
