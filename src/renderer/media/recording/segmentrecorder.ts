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
    startTime: Dayjs;
    duration: number;
    blob: Blob;
    isPartial: boolean;
}

type SegmentRecorderEvents = {
    onstart: (startTime: Dayjs) => void;
};

export class SegmentRecorder extends (EventEmitter as new () => TypedEventEmitter<SegmentRecorderEvents>) {
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
        if (this.isRecording) {
            return;
        }

        this.logger.log('start recording');

        this.recorder.start(1000);
        this._startTime = dayjs();

        this.startTimeout();
    }

    async stopRecording() {
        if (!this.isRecording) {
            return;
        }

        this.logger.log('stop recording');
        this.clearTimeout();

        await this.stopAndEnsureLastVideoChunk();
        await this.raiseRecording(false);

        this._startTime = null;
    }

    get isRecording() {
        return this._startTime !== null;
    }

    private timeout: any;
    private _startTime: Dayjs | null = null;

    get startTime() {
        return this._startTime;
    }

    private startTimeout() {
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
        if (event.data && event.data.size > 0) {
            this.chunks.push(event.data);
        }
    };

    onrecording: (recording: Recording) => Promise<void> = null!;

    private async raiseRecording(isPartial: boolean) {
        try {
            if (this.chunks.length === 0) {
                return;
            }

            const blobs = [...this.chunks];

            const rawBlob = new Blob(blobs, { type: this.options.mimeType });
            const fixedBlob = await fixWebmDuration(rawBlob);

            const recording: Recording = {
                startTime: this._startTime!,
                duration: durationSince(this._startTime!).asSeconds(),
                blob: fixedBlob,
                isPartial,
            };

            await this.onrecording(recording);

            if (!isPartial) {
                this.chunks = [];
            }

            return recording;
        } catch (e) {
            if (!this.isRecording) {
                // We're not recording right now
                return;
            } else {
                console.error(e);
                throw new Error(`fixWebDuration error most likely. See above.`);
            }
        }
    }

    forceRender() {
        this.logger.info('force rendering');
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
}
