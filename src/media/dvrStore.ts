import { action, makeAutoObservable } from 'mobx';
import { DigitalVideoRecorder } from './digitalvideorecorder';

export class DvrStore {
    isLive = true;
    isPaused = false;
    currentTime = 0;
    duration = 0;
    speed = 1;

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
        this.listenForTimeUpdate();
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

    private refreshControlAbilities() {
        const isPlayback = !this._dvr.isLive;

        this.isPlayDisabled = this.isNextFrameDisabled = isPlayback && this._dvr.isAtEnd;

        this.isRewindDisabled =
            isPlayback && (this._dvr.isAtMaxRewindSpeed || this._dvr.isAtBeginning);
        this.isSlowForwardDisabled =
            isPlayback && (this._dvr.isAtMinSlowSpeed || this._dvr.isAtEnd);
        this.isFastForwardDisabled =
            isPlayback && (this._dvr.isAtMaxFastForwardSpeed || this._dvr.isAtEnd);
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
