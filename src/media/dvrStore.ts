import { action, makeAutoObservable } from 'mobx';
import { DigitalVideoRecorder } from './digitalvideorecorder';

export class DvrStore {
    isLive = true;
    isPaused = false;
    currentTime = -1;
    duration = -1;
    speed = 1;

    constructor() {
        makeAutoObservable(this);
    }

    private dvr!: DigitalVideoRecorder;

    init(dvr: DigitalVideoRecorder) {
        this.dvr = dvr;

        this.listenForModeChange();
        this.listenForPlayPauseChange();
        this.listenForTimeUpdate();
    }

    private listenForModeChange() {
        this.isLive = this.dvr.isLive;

        this.dvr.on(
            'modechange',
            action(() => (this.isLive = this.dvr.isLive))
        );
    }

    private listenForPlayPauseChange() {
        this.isPaused = this.dvr.paused;

        this.dvr.on(
            'play',
            action(() => (this.isPaused = this.dvr.paused))
        );
        this.dvr.on(
            'pause',
            action(() => (this.isPaused = this.dvr.paused))
        );
    }

    private listenForTimeUpdate() {
        this.dvr.on(
            'timeupdate',
            action((currentTime, duration, speed) => {
                this.currentTime = currentTime = Math.floor(currentTime);
                this.duration = duration = Math.floor(duration);
                this.speed = speed;
            })
        );
    }
}
