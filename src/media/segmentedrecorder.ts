import EventEmitter from 'events';
import { DEFAULT_RECORDING_OPTIONS } from './constants';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { RecordingOptions } from './dvrconfig';
import { Segment } from './interfaces';
import { LiveStreamRecorder } from './livestreamrecorder';
import { SegmentCollection } from './segmentcollection';

export class SegmentedRecorder extends EventEmitter {
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
    private liveSegment: Segment = null!;
    private interval: any;

    start() {
        this.liveSegment = this._segments.createSegment();

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
        const segment = this.liveSegment;

        segment.chunks.push(blob);

        const blobs = new Blob(segment.chunks, { type: this.options.mimeType });

        segment.url = URL.createObjectURL(blobs);
        segment.duration = this.currentTime - segment.startTime;

        this._segments.addSegment(segment);
    }

    async getRecordedSegments() {
        await this.ensureHasSegmentToRender();

        return this._segments;
    }

    private get currentTime() {
        if (!this._segments.hasRecordingStartTime) {
            this.log(
                'Current time is unavailable. Assuming that the recording is initializing and returning zero.'
            );
            return 0;
        } else {
            return secondsSince(this._segments.recordingStartTime);
        }
    }

    private forcedRenderDone: ((hadToRender: boolean) => void) | null = null;

    ensureHasSegmentToRender() {
        if (!this._segments.isEmpty) {
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
        if (this._segments.isEmpty) {
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
