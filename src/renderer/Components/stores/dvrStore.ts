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
            | '_liveStreamDuration'
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
            _liveStreamDuration: observable,
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
    private _currentTime = dayjs();
    private _liveStreamDuration = 0;
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
        this.listenForStartTimeUpdate();
        this.listenForTimeUpdate();
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

    get liveStreamDuration() {
        return this._liveStreamDuration;
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

        this._isPlayDisabled = isPlayback && dvr.isAtEnd;
        this._isNextFrameDisabled = isPlayback && dvr.isAtEnd;

        this._isRewindDisabled = isPlayback && (dvr.isAtMaxRewindSpeed || dvr.isAtBeginning);
        this._isSlowForwardDisabled = isPlayback && (dvr.isAtMinSlowSpeed || dvr.isAtEnd);
        this._isFastForwardDisabled = isPlayback && (dvr.isAtMaxFastForwardSpeed || dvr.isAtEnd);
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

    private listenForStartTimeUpdate() {
        this._recordingStartTime = dayjs(this.dvr.recordingStartTime);

        this.dvr.on(
            'starttimeupdate',
            action(() => (this._recordingStartTime = this.dvr.recordingStartTime))
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

    private listenForTimeUpdate() {
        this.dvr.on(
            'timeupdate',
            action((currentTimeAsTime, duration, speed) => {
                const testMultiplier = 1;

                this._currentTime = currentTimeAsTime;
                this._liveStreamDuration = this.dvr.liveStreamDuration * testMultiplier;
                this._speed = speed;

                this.refreshControlAbilities();
            })
        );
    }
}
