import dayjs, { Dayjs } from 'dayjs';
import { action, makeAutoObservable, observable, runInAction } from 'mobx';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { TimelineStore } from './timelineStore';

export class DvrStore {
    constructor() {
        makeAutoObservable<
            DvrStore,
            | '_timeline'
            | '_dvr'
            | '_recordingStartTime'
            | '_currentTime'
            | '_duration'
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
            _currentTime: observable,
            _duration: observable,
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
    }

    private _timeline: TimelineStore;
    private _dvr: DigitalVideoRecorder | null = null;

    private _recordingStartTime: Dayjs = dayjs();
    private _currentTime = 0;
    private _duration = 0;
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

    get liveStreamDuration() {
        return this._liveStreamDuration;
    }

    get duration() {
        return this._duration;
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

                if (this.isLive) {
                    this.stopPollingLiveRecordingDuration();
                } else {
                    this.pollLiveRecordingDuration('playback');
                }

                this.refreshControlAbilities();
            })
        );
    }

    private interval: any = 0;

    private pollLiveRecordingDuration(reason: string) {
        if (this.interval === 0) {
            console.log(`Polling live duration. Reason=${reason}`);

            this.interval = setInterval(() => {
                runInAction(() => {
                    this._liveStreamDuration = this.dvr.liveStreamDuration;
                    this.refreshControlAbilities();
                });
            }, 1000);
        } else {
            console.log(`(no-op) Polling live duration. Reason=${reason}`);
        }
    }

    private stopPollingLiveRecordingDuration() {
        if (this.interval !== 0) {
            console.log('Stopping polling');
            clearInterval(this.interval);
            this.interval = 0;
        }
    }

    private listenForStartTimeUpdate() {
        this._recordingStartTime = dayjs(this.dvr.recordingStartTime);

        this.dvr.on(
            'starttimeupdate',
            action(() => (this._recordingStartTime = dayjs(this.dvr.recordingStartTime)))
        );
    }

    private listenForPlayPauseChange() {
        this._isPaused = this.dvr.paused;

        this.dvr.on(
            'play',
            action(() => {
                this.stopPollingLiveRecordingDuration();

                this._isPaused = this.dvr.paused;
            })
        );
        this.dvr.on(
            'pause',
            action(() => {
                if (!this.isLive) {
                    this.pollLiveRecordingDuration('pause');
                }

                this._isPaused = this.dvr.paused;
            })
        );
    }

    private listenForTimeUpdate() {
        this.dvr.on(
            'timeupdate',
            action((currentTime, duration, speed) => {
                this._currentTime = currentTime;
                this._duration = duration;
                this._speed = speed;
                this._liveStreamDuration = this.dvr.liveStreamDuration;

                this.refreshControlAbilities();
            })
        );
    }
}
