import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import fixWebmDuration from 'webm-duration-fix';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import TypedEventEmitter from '../eventemitter';
import { durationSince } from './dateutil';
// import ysFixWebmDuration from 'fix-webm-duration';

export interface Recording {
    estimatedStartTime: Dayjs;
    estimatedDuration: number;
    blob: Blob;
    isForced: boolean;
}

type SegmentedRecorderEvents = {
    onstart: (estimatedStartTime: Dayjs) => void;
};

export class SegmentRecorder extends (EventEmitter as new () => TypedEventEmitter<SegmentedRecorderEvents>) {
    private logger: Logger;
    private readonly recorder: MediaRecorder;
    readonly options: RecordingOptions;

    constructor(private readonly stream: MediaStream, options?: Partial<RecordingOptions>) {
        super();

        this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        this.logger = getLog('seg-rec', this.options);

        this.recorder = new MediaRecorder(this.stream, {
            mimeType: this.options.mimeType,
        });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    startRecording() {
        this.startTimeout();
    }

    async stopRecording() {
        this.clearTimeout();

        await this.stopAndEnsureLastVideoChunk();
        await this.raiseRecording(false);
        this.chunks = [];
    }

    get isRecording() {
        return this.timeout !== 0;
    }

    private timeout: any;
    private estimatedStartTime: Dayjs = null!;

    private startTimeout() {
        this.recorder.start(1000);
        this.estimatedStartTime = dayjs();
        this.emitOnStart();

        const ms = this.options.minSegmentSizeInSec * 1000;
        this.timeout = setTimeout(() => this.onTimeout(), ms);
    }

    private clearTimeout() {
        clearTimeout(this.timeout);
        this.timeout = 0;
    }

    private async onTimeout() {
        await this.stopRecording();
        this.startRecording();
    }

    private chunks: Blob[] = [];

    private onDataAvailable = (event: BlobEvent) => {
        this.chunks.push(event.data);
    };

    onrecording: (recording: Recording) => Promise<void> = null!;

    private async raiseRecording(isForced: boolean) {
        try {
            if (this.chunks.length === 0) {
                return;
            }

            const blobs = [...this.chunks];

            const rawBlob = new Blob(blobs, { type: this.options.mimeType });
            const fixedBlob = await fixWebmDuration(rawBlob);

            const recording: Recording = {
                estimatedStartTime: this.estimatedStartTime,
                estimatedDuration: durationSince(this.estimatedStartTime).asSeconds(),
                blob: fixedBlob,
                isForced,
            };

            await this.onrecording(recording);

            return recording;
        } catch (e) {
            if (!this.isRecording) {
                console.warn(e);
                return null!;
            } else {
                console.error(e);
                throw new Error(`fixWebDuration error most likely. See above.`);
            }
        }
    }

    forceRender() {
        return this.raiseRecording(true);
    }

    private stopAndEnsureLastVideoChunk() {
        return new Promise<void>((resolve) => {
            this.recorder.ondataavailable = (event) => {
                this.onDataAvailable(event);
                this.recorder.ondataavailable = this.onDataAvailable;
                resolve();
            };

            this.recorder.stop();
        });
    }

    private emitOnStart() {
        this.emit('onstart', this.estimatedStartTime);
    }
}
