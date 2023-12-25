import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import fixWebmDuration from 'webm-duration-fix';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { IServiceLocator } from '~/renderer/services';
import TypedEventEmitter from '../eventemitter';
import { durationSince } from './dateutil';
// import ysFixWebmDuration from 'fix-webm-duration';

export interface Recording {
    startTime: Dayjs;
    duration: number;
    blob: Blob;
    isPartial: boolean;
}

type SegmentRecorderEvents = {};

export class SegmentRecorder extends (EventEmitter as new () => TypedEventEmitter<SegmentRecorderEvents>) {
    private logger: Logger;
    readonly options: RecordingOptions;

    constructor(private readonly locator: IServiceLocator, options?: Partial<RecordingOptions>) {
        super();

        this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        this.logger = getLog('seg-rec', this.options);

        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private get recorder() {
        return this.locator.recorder;
    }

    get stream() {
        return this.recorder.stream;
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

        await this.stopRecordingAndWaitForLastVideoChunk();
        await this.raiseRecording(false);

        this._startTime = null;
    }

    get isRecording() {
        return this._startTime !== null;
    }

    private timeout: any;
    private _startTime: Dayjs | null = null;

    get startTime() {
        this.assertIsRecording();

        return this._startTime!;
    }

    get duration() {
        this.assertIsRecording();

        return durationSince(this.startTime).asSeconds();
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
        this.chunks.push(event.data);
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
                startTime: this.startTime,
                duration: this.duration,
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

    private stopRecordingAndWaitForLastVideoChunk() {
        return new Promise<void>((resolve) => {
            this.recorder.ondataavailable = (event) => {
                this.onDataAvailable(event);
                this.recorder.ondataavailable = this.onDataAvailable;
                resolve();
            };

            this.recorder.stop();
        });
    }

    private assertIsRecording() {
        if (!this.isRecording) {
            throw new Error(`Start time is only available during a recording`);
        }
    }
}
