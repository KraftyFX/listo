import dayjs from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import fixWebmDuration from 'webm-duration-fix';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Segment } from '~/renderer/media/interfaces';
import { Logger, getLog } from '~/renderer/media/logutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import TypedEventEmitter from '../eventemitter';
import { secondsSince } from './dateutil';
import { LiveStreamRecorder } from './livestreamrecorder';
// import ysFixWebmDuration from 'fix-webm-duration';

type SegmentedRecorderEvents = {
    recordingerror: (error: any) => void;
};

export class SegmentRecorder extends (EventEmitter as new () => TypedEventEmitter<SegmentedRecorderEvents>) {
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

    start() {
        try {
            this.startTimeout();
        } catch (err) {
            this.emit('recordingerror', err);
        }
    }

    async stop() {
        this.stopTimeout();

        this.recorder.stop();
    }

    private timeout: any;
    private startTime: Date = null!;

    private startTimeout() {
        this.recorder.start();
        this.startTime = new Date();

        if (!this.timeout) {
            const ms = this.options.minSegmentSizeInSec * 1000;
            this.timeout = setTimeout(() => this.recorder.stop(), ms);
        }
    }

    private stopTimeout() {
        clearTimeout(this.timeout);
        this.timeout = 0;
    }

    private onDataAvailable = async (event: BlobEvent) => {
        await this.finalizeSegment(event.data);
        this.start();
    };

    private async finalizeSegment(chunk: Blob) {
        const segment = this.segments.createSegment();

        segment.chunks.push(chunk);

        segment.duration = secondsSince(this.startTime);

        const blob = new Blob([...segment.chunks], { type: this.options.mimeType });
        const durationPatchedBlob = [await fixWebmDuration(blob)];

        segment.url = await window.listoApi.saveRecording(
            dayjs().toISOString(),
            segment.duration,
            durationPatchedBlob
        );

        this.segments.addSegment(segment);

        this.resolveForceRenderPromise(segment);
    }

    private promise: Promise<Segment> | null = null;
    private resolve: ((segment: Segment) => void) | null = null;

    forceRender() {
        return (
            this.promise ||
            (this.promise = new Promise<Segment>((resolve) => {
                this.logger.info('Forcing segment rendering');
                this.resolve = resolve;
                this.stop();
            }))
        );
    }

    private resolveForceRenderPromise(segment: Segment) {
        if (this.resolve) {
            this.resolve(segment);
            this.resolve = null;
            this.promise = null;
        }
    }
}
