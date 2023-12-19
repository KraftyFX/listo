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

    private liveSegment: Segment = null!;
    private startTime: Date = null!;

    start() {
        this.liveSegment = this.segments.createSegment();
        this.startTime = new Date();

        try {
            this.recorder.start();

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

    private startTimeout() {
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
        await this.finalizeLiveSegment(event.data);
        this.start();

        this.resolveForceRenderDonePromise();
    };

    private async finalizeLiveSegment(chunk: Blob) {
        const segment = this.liveSegment;

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
    }

    private forcedRenderDone: (() => void) | null = null;

    fillSegments() {
        return new Promise<void>((resolve) => {
            this.logger.info('Forcing segment rendering');
            this.forcedRenderDone = resolve;
            this.stop();
        });
    }

    private resolveForceRenderDonePromise() {
        if (this.forcedRenderDone) {
            this.assertHasSegmentToRender();

            this.forcedRenderDone();
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
