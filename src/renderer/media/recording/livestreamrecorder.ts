import { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import _merge from 'lodash.merge';
import { DEFAULT_RECORDING_OPTIONS, RecordingOptions } from '~/renderer/media';
import { Logger, getLog } from '~/renderer/media/logutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { getLocator } from '~/renderer/services';
import TypedEventEmitter from '../eventemitter';
import { Segment } from '../segments/interfaces';
import { Recording } from './interfaces';
import { MediaStreamRecorder } from './mediastreamrecorder';

type LiveStreamRecorderEvents = {
    play: () => void;
    pause: () => void;
    update: () => void;
};

export class LiveStreamRecorder extends (EventEmitter as new () => TypedEventEmitter<LiveStreamRecorderEvents>) {
    private readonly recorder: MediaStreamRecorder;
    private logger: Logger;
    public readonly options: RecordingOptions;
    public readonly segments: SegmentCollection;

    constructor();
    constructor(options: Partial<RecordingOptions>);
    constructor(segment: SegmentCollection, options: Partial<RecordingOptions>);
    constructor(
        segmentsOrOptions?: SegmentCollection | Partial<RecordingOptions>,
        options?: Partial<RecordingOptions>
    ) {
        super();

        if (segmentsOrOptions instanceof SegmentCollection) {
            this.segments = segmentsOrOptions;
            this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, options);
        } else {
            this.segments = new SegmentCollection();
            this.options = _merge({}, DEFAULT_RECORDING_OPTIONS, segmentsOrOptions);
        }

        this.logger = getLog('lsr', this.options);

        this.recorder = new MediaStreamRecorder(this.options);
        this.recorder.onrecording = (recording) => this.onRecording(recording);
    }

    private get locator() {
        return getLocator();
    }

    private get player() {
        return this.locator.player;
    }

    private async onRecording(recording: Recording) {
        const { startTime, isPartial } = recording;

        this.logger.log(`Recording yielded ${startTime.format('mm:ss.SS')} partial=${isPartial}`);

        if (this.segments.isLastSegmentPartial) {
            this.disposeSegment(this.segments.lastSegment);
        }

        const url = await this.saveRecording(recording);

        this.segments.addSegment(recording, url);
    }

    private async saveRecording(recording: Recording) {
        if (recording.isPartial || this.options.inMemory) {
            return this.locator.host.createObjectURL(recording.blob);
        } else {
            return this.locator.listo.saveRecording(recording, false);
        }
    }

    private disposeSegment(segment: Segment) {
        if (segment.isPartial || this.options.inMemory) {
            this.locator.host.revokeObjectURL(segment.url);
            segment.url = '';
            segment.blob = null!;
        } else {
            throw new Error(`Disposing saved segments on disk is invalid for this component.`);
        }
    }

    /**
     * Converts a time to a timecode relative to the start time of the most recent recording
     * @param time time to convert
     * @returns timecode
     */
    getAsTimecode(time: Dayjs) {
        this.assertIsRecording();

        return time.diff(this.startTime) / 1000;
    }

    get isRecording() {
        return this.recorder.isRecording;
    }

    get recording() {
        this.assertIsRecording();

        return {
            startTime: this.startTime,
            duration: this.duration,
            endTime: this.startTime.add(this.duration, 'seconds'),
        };
    }

    private get startTime() {
        this.assertIsRecording();

        return this.recorder.startTime;
    }

    get duration() {
        this.assertIsRecording();

        return this.recorder.duration;
    }

    async forceFillWithLatestVideoData() {
        this.assertIsRecording();

        await this.recorder.yieldPartialRecording();

        this.assertHasSegments();
        this.assertLastSegmentIsPartial();
    }

    private _isVideoSource = false;

    get isVideoSource() {
        return this._isVideoSource;
    }

    async setAsVideoSource() {
        if (!this.isVideoSource) {
            await this.player.setVideoSource(this.recorder.stream);
            this.player.ontimeupdate = () => this.emitUpdate();
            this._isVideoSource = true;
        }
    }

    async releaseAsVideoSource() {
        if (this.isVideoSource) {
            await this.player.setVideoSource(null);
            this.player.ontimeupdate = null;
            this._isVideoSource = false;
        }
    }

    get paused() {
        return this.player.paused;
    }

    async startRecording() {
        if (this.isRecording) {
            return;
        }

        await this.recorder.startRecording();
    }

    async stopRecording() {
        if (!this.isRecording) {
            return;
        }

        await this.recorder.stopRecording();
    }

    private assertIsRecording() {
        if (!this.isRecording) {
            throw new Error(`There is no recording currently active.`);
        }
    }

    async play() {
        this.assertIsActiveVideoSource();

        await this.player.play();
        this.emitPlay();
    }

    async pause() {
        this.assertIsActiveVideoSource();

        await this.player.pause();
        this.emitPause();
    }

    private assertIsActiveVideoSource() {
        if (!this._isVideoSource) {
            throw new Error(
                `This is only available when playback the active source on the video element`
            );
        }
    }

    private assertHasSegments() {
        if (this.segments.isEmpty) {
            throw new Error(
                `No segments were produced after being told to force render. This is a logic error.`
            );
        }
    }

    private assertLastSegmentIsPartial() {
        if (!this.segments.lastSegment.isPartial) {
            throw new Error(
                `A segment was forcefully rendered but and should have been partial but was not. Thre is alogic error`
            );
        }
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitUpdate() {
        if (this.isRecording) {
            this.emit('update');
        }
    }
}
