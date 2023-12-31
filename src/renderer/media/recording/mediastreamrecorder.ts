import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import fixWebmDuration from 'webm-duration-fix';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { getLocator } from '~/renderer/services';
import TypedEventEmitter from '../eventemitter';
import { Recording } from './interfaces';
// import ysFixWebmDuration from 'fix-webm-duration';

type SegmentRecorderEvents = {};

export class MediaStreamRecorder extends (EventEmitter as new () => TypedEventEmitter<SegmentRecorderEvents>) {
    private logger: Logger;
    public readonly options: RecordingOptions;

    constructor(options: Partial<RecordingOptions> = DEFAULT_RECORDING_OPTIONS) {
        super();

        this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        this.logger = getLog('seg-rec', this.options);

        this.reader.ondataavailable = this.onDataAvailable;
    }

    private get reader() {
        return this.locator.reader;
    }

    get stream() {
        return this.reader.stream;
    }

    private get locator() {
        return getLocator();
    }

    startRecording() {
        if (this.isRecording) {
            return;
        }

        this.logger.log('start recording');

        this.reader.start(1000);
        this._startTime = this.locator.host.now;

        this.startTimeout();
    }

    async stopRecording() {
        if (!this.isRecording) {
            return;
        }

        this.logger.log('stop recording');
        this.clearTimeout();

        await this.reader.stop();
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

        const { host } = this.locator;

        return dayjs.duration(host.now.diff(this.startTime)).asSeconds();
    }

    private startTimeout() {
        const ms = this.options.minSizeInSec * 1000;
        const { setTimeout } = this.locator.host;
        this.timeout = setTimeout(() => this.onTimeout(), ms);
    }

    private clearTimeout() {
        const { clearTimeout } = this.locator.host;
        clearTimeout(this.timeout);
        this.timeout = 0;
    }

    private async onTimeout() {
        await this.stopRecording();
        this.startRecording();
    }

    private chunks: Blob[] = [];

    private onDataAvailable = (blob: Blob) => {
        this.chunks.push(blob);
    };

    onrecording: ((recording: Recording, blob: Blob) => Promise<void>) | null = null;

    private async raiseRecording(isPartial: boolean) {
        if (this.chunks.length === 0) {
            return null;
        }

        const rawBlob = new Blob([...this.chunks], { type: this.options.mimeType });
        const fixedBlob = this.options.fixDuration ? await this.tryFixBlob(rawBlob) : rawBlob;

        const recording: Recording = {
            startTime: this.startTime,
            duration: this.duration,
            isPartial,
        };

        if (this.onrecording) {
            await this.onrecording(recording, fixedBlob);
        }

        if (!isPartial) {
            this.chunks = [];
        }

        return recording;
    }

    async tryFixBlob(blob: Blob) {
        try {
            return await fixWebmDuration(blob);
        } catch (e) {
            console.error(e);
            throw new Error(`fixWebDuration error`);
        }
    }

    yieldPartialRecording() {
        this.assertIsRecording();

        this.logger.info('force yielding a partial recording');
        return this.raiseRecording(true);
    }

    private assertIsRecording() {
        if (!this.isRecording) {
            throw new Error(`This is only available during recording`);
        }
    }
}
