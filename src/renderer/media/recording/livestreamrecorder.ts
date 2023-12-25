import { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import { RecordingOptions } from '~/renderer/media';
import { Logger, getLog } from '~/renderer/media/logutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { IServiceLocator } from '~/renderer/services';
import TypedEventEmitter from '../eventemitter';
import { Recording, SegmentRecorder } from './segmentrecorder';

type LiveStreamRecorderEvents = {
    play: () => void;
    pause: () => void;
    update: () => void;
};

export class LiveStreamRecorder extends (EventEmitter as new () => TypedEventEmitter<LiveStreamRecorderEvents>) {
    private readonly recorder: SegmentRecorder;
    private logger: Logger;

    constructor(
        private readonly locator: IServiceLocator,
        public readonly segments: SegmentCollection,
        public readonly options: RecordingOptions
    ) {
        super();

        this.logger = getLog('lsr', this.options);

        this.recorder = new SegmentRecorder(locator, options);
        this.recorder.onrecording = (recording) => this.onRecording(recording);
    }

    private get player() {
        return this.locator.player;
    }

    /**
     * The onRecording method saves whatever blob we got from the segment recorder.
     *
     * If a user wants to scrub through something super recent that's still being recorded then
     * the DVR will call to `forceRender()` ensure playable video data is available. This will
     * yield a partial segment (i.e. a segment with less data than normally expected). We want
     * to keep this around temorarily and treat it like a normal segment until its full version
     * comes in to replace it.
     */
    private async onRecording(recording: Recording) {
        const { startTime, duration, isPartial } = recording;

        this.logger.log(`Recording yielded ${startTime.format('mm:ss.SS')} partial=${isPartial}`);

        const url = await this.saveRecording(recording);

        this.clearAnyPreviousPartialSegments();

        this.segments.addSegment(startTime, url, duration, isPartial);
    }

    private clearAnyPreviousPartialSegments() {
        if (!this.segments.isEmpty && this.segments.lastSegment.isPartial) {
            URL.revokeObjectURL(this.segments.lastSegment.url);
            this.segments.removeLastSegment();
        }
    }

    private async saveRecording(recording: Recording) {
        const { startTime, duration, blob, isPartial } = recording;

        if (isPartial || this.options.inMemory) {
            return URL.createObjectURL(blob);
        } else {
            return await window.listoApi.saveRecording(startTime.toISOString(), duration, [blob]);
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

    async tryFillSegments(time: Dayjs) {
        if (this.containsTime(time)) {
            await this.recorder.forceRender();

            this.assertHasSegment(time);

            return true;
        } else {
            return false;
        }
    }

    containsTime(time: Dayjs) {
        return this.isRecording && time.isSameOrBefore(this.recording.endTime);
    }

    private _isVideoSource = false;

    async setAsVideoSource() {
        if (!this._isVideoSource) {
            this.player.setVideoSource(this.recorder.stream);
            this.player.ontimeupdate = () => this.emitUpdate();
            this._isVideoSource = true;
        }
    }

    releaseAsVideoSource() {
        if (this._isVideoSource) {
            // TODO: Release video source

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

    private assertHasSegment(time: Dayjs) {
        if (!this.segments.containsTime(time)) {
            const timecode = this.getAsTimecode(time);

            throw new Error(
                `The segment recorder was told to force render everything but didn't produce data at ${timecode}`
            );
        }
    }

    async play() {
        this.assertIsActiveVideoSource();

        await this.player.play();
        this.emitPlay();
    }

    async pause() {
        this.assertIsActiveVideoSource();

        await this.player.play();
        this.emitPause();
    }

    private assertIsActiveVideoSource() {
        if (!this._isVideoSource) {
            throw new Error(
                `This is only available when playback the active source on the video element`
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
