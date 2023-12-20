import EventEmitter from 'events';
import { RecordingOptions } from '~/renderer/media';
import { Logger, getLog } from '~/renderer/media/logutil';
import { pauseAndWait, playAndWait } from '~/renderer/media/playback/playbackutil';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import TypedEventEmitter from '../eventemitter';
import { secondsSince, subtractSecondsFromNow } from './dateutil';
import { SegmentRecorder } from './segmentrecorder';

type LiveStreamRecorderEvents = {
    play: () => void;
    pause: () => void;
    timeupdate: (duration: number) => void;
    starttimeupdate: () => void;
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
        this.recorder.onrecording = async ({ startTime, duration, blob }) => {
            const url = await window.listoApi.saveRecording(startTime.toISOString(), duration, [
                blob,
            ]);

            this.segments.addSegment(url, duration);
        };
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

    private _recordingStartTime: Date | null = null;

    public get recordingStartTime() {
        if (!this._recordingStartTime) {
            throw new Error(
                `The recording start time is only available after startRecording() is called.`
            );
        }

        return this._recordingStartTime;
    }

    get duration() {
        if (this._isVideoSource && !this.videoElt.paused) {
            this.updateEstimatedRecordingStartTime();
            const actualDuration = this.videoElt.currentTime;

            return actualDuration;
        } else {
            this.logger.log('Using estimated duration of live feed.');

            const estimatedDuration = secondsSince(this.recordingStartTime);

            return estimatedDuration;
        }
    }

    async fillSegmentsToIncludeTimecode(timecode: number) {
        this.assertIsTimecodeWithinRecordingDuration(timecode);

        if (!this.segments.isEmpty && this.segments.endOfTime < timecode) {
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

    private assertIsTimecodeWithinRecordingDuration(timecode: number) {
        const marginOfErrorAllowed = 1;

        if (timecode < 0 || timecode > this.duration + marginOfErrorAllowed) {
            throw new Error(
                `The requested time ${timecode} is outside the bounds of the recorded duration (${this.duration}).`
            );
        }
    }

    private updateEstimatedRecordingStartTime() {
        const recordingStartTime = subtractSecondsFromNow(this.videoElt.currentTime);

        if (recordingStartTime.getMilliseconds() < this._recordingStartTime!.getMilliseconds()) {
            this.logger.log(`Updating recording start time ${recordingStartTime}`);
            this._recordingStartTime = recordingStartTime;
            this.emitStartTimeUpdate();
        }
    }

    private _isVideoSource = false;

    async setAsVideoSource() {
        this.videoElt.src = '';
        this.videoElt.srcObject = this.stream;
        this.videoElt.ontimeupdate = () => this.emitTimeUpdate();
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
        this._recordingStartTime = new Date();
        await this.recorder.start();
    }

    async stopRecording() {
        await this.recorder.stop();
    }

    async play() {
        await playAndWait(this.videoElt);
        this.emitPlay();
    }

    async pause() {
        await pauseAndWait(this.videoElt);
        this.emitPause();
    }

    private emitTimeUpdate() {
        this.emit('timeupdate', this.duration);
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }

    private emitStartTimeUpdate() {
        this.emit('starttimeupdate');
    }
}
