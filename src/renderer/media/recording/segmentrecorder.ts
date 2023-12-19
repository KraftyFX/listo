import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import fixWebmDuration from 'webm-duration-fix';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import TypedEventEmitter from '../eventemitter';
import { secondsSince } from './dateutil';
import { LiveStreamRecorder } from './livestreamrecorder';
// import ysFixWebmDuration from 'fix-webm-duration';

interface Recording {
    startTime: Dayjs;
    duration: number;
    blob: Blob;
}

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

    onrecording: (recording: Recording) => Promise<void> = null!;

    private onDataAvailable = async (event: BlobEvent) => {
        const duration = secondsSince(this.startTime);

        const rawBlob = new Blob([event.data], { type: this.options.mimeType });
        const fixedBlob = await fixWebmDuration(rawBlob);
        const recording: Recording = {
            startTime: dayjs(this.startTime),
            duration,
            blob: fixedBlob,
        };

        await this.onrecording(recording);

        this.resolveForceRenderPromise(recording);
        this.start();
    };

    private promise: Promise<Recording> | null = null;
    private resolve: ((recording: Recording) => void) | null = null;

    forceRender() {
        return (
            this.promise ||
            (this.promise = new Promise<Recording>((resolve) => {
                this.logger.info('Forcing recording rendering');
                this.resolve = resolve;
                this.stop();
            }))
        );
    }

    private resolveForceRenderPromise(recording: Recording) {
        if (this.resolve) {
            this.resolve(recording);
            this.resolve = null;
            this.promise = null;
        }
    }
}
