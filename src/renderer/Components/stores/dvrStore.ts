import dayjs, { Dayjs } from 'dayjs';
import { action, makeAutoObservable, observable } from 'mobx';
import { DigitalVideoRecorder } from '~/renderer/media/dvr';
import { CameraStore } from './cameraStore';
import { TimelineStore } from './timelineStore';

export class DvrStore {
    constructor() {
        makeAutoObservable<
            DvrStore,
            | '_timeline'
            | '_dvr'
            | '_recordingStartTime'
            | '_currentTime'
            | '_recordingDuration'
            | '_speed'
            | '_isLive'
            | '_isPaused'
            | '_isPlayDisabled'
            | '_isNextFrameDisabled'
            | '_isRewindDisabled'
            | '_isSlowForwardDisabled'
            | '_isFastForwardDisabled'
        >(this, {
            _timeline: false,
            _dvr: observable.ref,

            _recordingStartTime: observable.ref,
            _currentTime: observable.ref,
            _recordingDuration: observable,
            _speed: observable,

            _isLive: observable,
            _isPaused: observable,
            _isPlayDisabled: observable,
            _isNextFrameDisabled: observable,
            _isRewindDisabled: observable,
            _isSlowForwardDisabled: observable,
            _isFastForwardDisabled: observable,
        });

        this._timeline = new TimelineStore(this);
        this._cameraStore = new CameraStore();
    }

    private _timeline: TimelineStore;
    private _cameraStore: CameraStore;
    private _dvr: DigitalVideoRecorder | null = null;

    private _recordingStartTime: Dayjs = dayjs();
    private _recordingDuration = 0;
    private _currentTime = dayjs();
    private _speed = 1;

    private _isLive = true;
    private _isPaused = false;
    private _isPlayDisabled = false;
    private _isNextFrameDisabled = false;
    private _isRewindDisabled = false;
    private _isSlowForwardDisabled = false;
    private _isFastForwardDisabled = false;

    get timeline() {
        return this._timeline;
    }

    get cameraStore() {
        return this._cameraStore;
    }

    get dvr() {
        if (!this._dvr) {
            throw new Error(`The DVR has not been set yet.`);
        }

        return this._dvr;
    }

    set dvr(value: DigitalVideoRecorder) {
        if (this._dvr) {
            throw new Error(`The DVR can only be set once`);
        }

        this._dvr = value;

        this.listenForModeChange();
        this.listenForPlayPauseChange();
        this.listenForLiveUpdates();
        this.listenForPlaybackUpdate();
        this.listenForSegmentUpdated();
        this.listenForSegmentAdded();
    }

    get recordingStartTime() {
        return this._recordingStartTime;
    }

    get currentTime() {
        return this._currentTime;
    }

    set currentTime(time: Dayjs) {
        this.dvr.goToPlaybackTime(time);
    }

    get recordingDuration() {
        return this._recordingDuration;
    }

    get speed() {
        return this._speed;
    }

    get isLive() {
        return this._isLive;
    }

    get isPaused() {
        return this._isPaused;
    }

    get isPlayDisabled() {
        return this._isPlayDisabled;
    }

    get isNextFrameDisabled() {
        return this._isNextFrameDisabled;
    }

    get isRewindDisabled() {
        return this._isRewindDisabled;
    }

    get isSlowForwardDisabled() {
        return this._isSlowForwardDisabled;
    }

    get isFastForwardDisabled() {
        return this._isFastForwardDisabled;
    }

    private refreshControlAbilities() {
        const dvr = this.dvr;

        const isPlayback = !dvr.isLive;

        if (isPlayback) {
            this._isPlayDisabled = dvr.isAtEnd;
            this._isNextFrameDisabled = dvr.isAtEnd;

            this._isRewindDisabled = dvr.isAtMaxRewindSpeed || dvr.isAtBeginning;
            this._isSlowForwardDisabled = dvr.isAtMinSlowSpeed || dvr.isAtEnd;
            this._isFastForwardDisabled = dvr.isAtMaxFastForwardSpeed || dvr.isAtEnd;
        } else {
            this._isPlayDisabled = false;
            this._isNextFrameDisabled = false;

            this._isRewindDisabled = false;
            this._isSlowForwardDisabled = false;
            this._isFastForwardDisabled = false;
        }
    }

    private listenForModeChange() {
        this._isLive = this.dvr.isLive;

        this.dvr.on(
            'modechange',
            action(() => {
                this._isLive = this.dvr.isLive;

                this.refreshControlAbilities();
            })
        );
    }

    private listenForPlayPauseChange() {
        this._isPaused = this.dvr.paused;

        this.dvr.on(
            'play',
            action(() => (this._isPaused = this.dvr.paused))
        );
        this.dvr.on(
            'pause',
            action(() => (this._isPaused = this.dvr.paused))
        );
    }

    private listenForLiveUpdates() {
        this.dvr.on(
            'liveupdate',
            action(() => {
                this.updateLiveRecordingStats();

                // When the app is in playback mode we're still getting live data
                // but the user might be paused or scrubbing. As a result we only
                // want to update the current time if we're actually in live mode.
                if (this.isLive) {
                    this._currentTime = this._recordingStartTime.add(
                        this._recordingDuration,
                        'seconds'
                    );
                }
            })
        );
    }

    private listenForPlaybackUpdate() {
        this.dvr.on(
            'playbackupdate',
            action((currentTime, speed) => {
                this.updateLiveRecordingStats();

                this._currentTime = currentTime;
                this._speed = speed;

                this.refreshControlAbilities();
            })
        );
    }

    private updateLiveRecordingStats() {
        const { startTime, duration } = this.dvr.recording;

        this._recordingStartTime = startTime;
        this._recordingDuration = duration;
    }

    private listenForSegmentUpdated() {
        this.dvr.on(
            'segmentupdated',
            action(() => this.refreshRecordings())
        );
    }

    private listenForSegmentAdded() {
        this.dvr.on(
            'segmentadded',
            action(() => this.refreshRecordings())
        );
    }

    private refreshRecordings() {
        // TODO: Normalize on dayjs.duration?
        this.timeline.pastRecordings = this.dvr.playableRecordings.map(
            ({ isPartial, startTime, duration }) => ({
                isPartial,
                startTime,
                duration: dayjs.duration(duration, 'seconds'),
            })
        );
    }
}
