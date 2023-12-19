import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { RecordingOptions } from '~/renderer/media';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import TypedEventEmitter from '../eventemitter';

type StreamingRecorderEvents = {
    recordingerror: (error: any) => void;
    start: (startTime: Dayjs, blob: Blob) => void;
    append: (blob: Blob) => void;
};

export class StreamingRecorder extends (EventEmitter as new () => TypedEventEmitter<StreamingRecorderEvents>) {
    private logger: Logger;
    private readonly recorder: MediaRecorder;
    public readonly options: RecordingOptions;

    constructor(private readonly stream: MediaStream, options?: Partial<RecordingOptions>) {
        super();

        this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        this.logger = getLog('seg-rec', this.options);

        this.recorder = new MediaRecorder(this.stream, {
            mimeType: this.options.mimeType,
        });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private _startTime!: dayjs.Dayjs;

    start() {
        try {
            this.isFirstChunk = true;

            this.recorder.start(this.options.minSegmentSizeInSec * 1000);
            this._startTime = dayjs();
        } catch (err) {
            this.emit('recordingerror', err);
        }
    }

    async stop() {
        this.recorder.stop();
    }

    private isFirstChunk = true;

    private onDataAvailable = (event: BlobEvent) => {
        if (this.isFirstChunk) {
            this.emit('start', this._startTime, event.data);
            this.isFirstChunk = false;
        } else {
            this.emit('append', event.data);
        }
    };
}
