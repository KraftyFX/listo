import dayjs, { Dayjs } from 'dayjs';
import EventEmitter from 'events';
import { RecordingOptions } from '~/renderer/media';
import { Logger, getLog } from '~/renderer/media/logutil';
import { pauseAndWait, playAndWait } from '~/renderer/media/playback/playbackutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import TypedEventEmitter from '../eventemitter';
import { durationSince } from './dateutil';
import { SegmentRecorder } from './segmentrecorder';

type LiveStreamRecorderEvents = {
    play: () => void;
    pause: () => void;
    update: () => void;
};

export class LiveStreamRecorder extends (EventEmitter as new () => TypedEventEmitter<LiveStreamRecorderEvents>) {
    private readonly recorder: SegmentRecorder;
    private logger: Logger;

    private constructor(
        public readonly videoElt: HTMLVideoElement,
        public readonly stream: MediaStream,
        public readonly segments: SegmentCollection,
        public readonly options: RecordingOptions
    ) {
        super();

        this.logger = getLog('lsr', this.options);

        this.recorder = new SegmentRecorder(this.stream, options);
        this.recorder.on('onstart', (estimatedStartTime) => {
            this._startTime = estimatedStartTime;
        });
        this.recorder.onrecording = async (recording) => {
            const { estimatedStartTime: startTime, estimatedDuration: duration, blob } = recording;

            const url = recording.isForced
                ? URL.createObjectURL(blob)
                : await this.saveBlob(startTime, duration, blob);

            this.segments.addSegment(startTime, url, duration, recording.isForced);
        };
    }

    private async saveBlob(startTime: Dayjs, duration: number, blob: Blob) {
        if (this.options.inMemory) {
            return URL.createObjectURL(blob);
        } else {
            return await window.listoApi.saveRecording(startTime.toISOString(), duration, [blob]);
        }
    }

    static async createFromUserCamera(
        videoElt: HTMLVideoElement,
        segments: SegmentCollection,
        options: RecordingOptions
    ) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: options.source,
            },
        });

        assertLiveStreamAcquired();

        const recorder = new LiveStreamRecorder(videoElt, stream, segments, options);

        return recorder;

        function assertLiveStreamAcquired() {
            if (!stream) {
                throw new Error(`User denied access to the camera. Can't acquire live stream.`);
            }
        }
    }

    getAsTimecode(time: Dayjs) {
        return time.diff(this.startTime) / 1000;
    }

    public get recording() {
        return {
            startTime: this.startTime,
            duration: this.duration,
            endTime: this.startTime.add(this.duration, 'seconds'),
        };
    }

    private _startTime: Dayjs | null = null;

    private get startTime() {
        this.assertIsRecording();

        return this._startTime!;
    }

    private assertIsRecording() {
        if (!this._startTime) {
            throw new Error(
                `The recording start time is only available after startRecording() is called.`
            );
        }
    }

    get duration() {
        return durationSince(this.startTime).asSeconds();
    }

    async fillSegmentsToIncludeTime(time: Dayjs) {
        this.assertFillIsPossible(time);

        if (this.segments.isEmpty || this.segments.lastSegmentEndTime.isBefore(time)) {
            await this.recorder.forceRender();
            this.assertHasSegmentToRender();

            return true;
        } else {
            return false;
        }
    }

    private assertHasSegmentToRender() {
        if (this.segments.isEmpty) {
            throw new Error(
                `The segmented recorder was told to force render everything. It did that but the segments array is somehow empty.`
            );
        }
    }

    private assertFillIsPossible(time: Dayjs) {
        const { startTime, endTime } = this.recording;

        if (time.isAfter(endTime)) {
            const timecode = time.diff(startTime) / 1000;

            throw new Error(
                `The requested time ${timecode} is outside the bounds of the recorded duration (${this.duration}).`
            );
        }
    }

    private _isVideoSource = false;

    async setAsVideoSource() {
        this.videoElt.src = '';
        this.videoElt.srcObject = this.stream;
        this.videoElt.ontimeupdate = () => this.emitUpdate();
        this._isVideoSource = true;
    }

    releaseAsVideoSource() {
        this.videoElt.ontimeupdate = null;
        this._isVideoSource = false;
    }

    get paused() {
        return this.videoElt.paused;
    }

    async startRecording() {
        this._startTime = dayjs();
        await this.recorder.startRecording();
    }

    async stopRecording() {
        this._startTime = null;
        await this.recorder.stopRecording();
    }

    async play() {
        await playAndWait(this.videoElt);
        this.emitPlay();
    }

    async pause() {
        await pauseAndWait(this.videoElt);
        this.emitPause();
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitUpdate() {
        this.emit('update');
    }
}
