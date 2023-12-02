import dayjs, { Dayjs } from 'dayjs';
import { action, makeAutoObservable } from 'mobx';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';

export class DvrStore {
    isLive = true;
    isPaused = false;
    currentTime = 0;
    duration = 0;
    speed = 1;
    recordingStartTime: Dayjs = dayjs();

    estimatedRecordingStartTime: Dayjs = null!;

    isPlayDisabled = false;
    isNextFrameDisabled = false;
    isRewindDisabled = false;
    isSlowForwardDisabled = false;
    isFastForwardDisabled = false;

    constructor() {
        makeAutoObservable(this);
    }

    public get dvr() {
        return this._dvr;
    }
    private _dvr!: DigitalVideoRecorder;

    init(dvr: DigitalVideoRecorder) {
        this._dvr = dvr;

        this.listenForModeChange();
        this.listenForPlayPauseChange();
        this.listenForStartTimeUpdate();
        this.listenForTimeUpdate();
    }

    private refreshControlAbilities() {
        const dvr = this._dvr;

        const isPlayback = !dvr.isLive;

        this.isPlayDisabled = isPlayback && dvr.isAtEnd;
        this.isNextFrameDisabled = isPlayback && dvr.isAtEnd;

        this.isRewindDisabled = isPlayback && (dvr.isAtMaxRewindSpeed || dvr.isAtBeginning);
        this.isSlowForwardDisabled = isPlayback && (dvr.isAtMinSlowSpeed || dvr.isAtEnd);
        this.isFastForwardDisabled = isPlayback && (dvr.isAtMaxFastForwardSpeed || dvr.isAtEnd);
    }

    private listenForModeChange() {
        this.isLive = this._dvr.isLive;

        this._dvr.on(
            'modechange',
            action(() => {
                this.isLive = this._dvr.isLive;
                this.refreshControlAbilities();
            })
        );
    }

    private listenForStartTimeUpdate() {
        this.isLive = this._dvr.isLive;

        this._dvr.on(
            'starttimeupdate',
            action(() => (this.recordingStartTime = dayjs(this._dvr.recordingStartTime)))
        );
    }

    private listenForPlayPauseChange() {
        this.isPaused = this._dvr.paused;

        this._dvr.on(
            'play',
            action(() => (this.isPaused = this._dvr.paused))
        );
        this._dvr.on(
            'pause',
            action(() => (this.isPaused = this._dvr.paused))
        );
    }

    private listenForTimeUpdate() {
        this._dvr.on(
            'timeupdate',
            action((currentTime, duration, speed) => {
                this.currentTime = currentTime = Math.floor(currentTime);
                this.duration = duration = Math.floor(duration);
                this.speed = speed;

                this.refreshControlAbilities();
            })
        );
    }
}
