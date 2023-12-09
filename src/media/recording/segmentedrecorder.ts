import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { RecordingOptions } from '~/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/media/constants';
import { Segment } from '~/media/interfaces';
import { Logger, getLog } from '~/media/logutil';
import { SegmentCollection } from '~/media/segments/segmentcollection';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { LiveStreamRecorder } from './livestreamrecorder';

export class SegmentedRecorder extends EventEmitter {
    private logger: Logger;
    private readonly recorder: MediaRecorder;
    public readonly options: RecordingOptions;

    constructor(
        private readonly liveStream: LiveStreamRecorder,
        public readonly segments: SegmentCollection,
        options?: Partial<RecordingOptions>
    ) {
        super();

        this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        this.liveStream = liveStream;
        this.logger = getLog('seg-rec', this.options);

        this.recorder = new MediaRecorder(this.liveStream.stream, {
            mimeType: this.options.mimeType,
        });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private liveSegment: Segment = null!;
    private interval: any;

    start() {
        this.liveSegment = this.segments.createSegment();

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

        this.finalizeLiveSegment(event.data);
        this.start();

        this.resolveForceRenderDonePromise();
    };

    private acquireAccurateRecordingStartTime() {
        if (!this.segments.hasRecordingStartTime) {
            this.segments.recordingStartTime = subtractSecondsFromNow(
                this.liveStream.videoElt.currentTime
            );
        }
    }

    private finalizeLiveSegment(blob: Blob) {
        const segment = this.liveSegment;

        segment.chunks.push(blob);

        const blobs = new Blob(segment.chunks, { type: this.options.mimeType });

        segment.url = URL.createObjectURL(blobs);
        segment.duration = this.recordingDuration - segment.startTime;

        this.segments.addSegment(segment);
    }

    private get recordingDuration() {
        if (!this.segments.hasRecordingStartTime) {
            this.logger.log(
                'Current time is unavailable. Assuming that the recording is initializing and returning zero.'
            );
            return 0;
        } else {
            return secondsSince(this.segments.recordingStartTime);
        }
    }

    private forcedRenderDone: ((hadToRender: boolean) => void) | null = null;

    /**
     * Fills the segment collection with more data if and only if the provided
     * timecode is for a moment beyond what has already been recorded.
     *
     * @param timecode the timecode that is about to be rendered.
     * @returns boolean indicating if a fill occurred.
     */
    fillSegments(timecode: number) {
        if (timecode > this.segments.duration) {
            return new Promise<boolean>((resolve) => {
                this.logger.info('Forcing segment rendering');
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
        if (this.segments.isEmpty) {
            throw new Error(
                `The chunked recorder was told to force render a segment. It did that but the segments array is somehow empty.`
            );
        }
    }
}
