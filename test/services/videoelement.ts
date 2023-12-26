import { IVideoPlayer } from './interfaces';

export class MockVideoPlayer implements IVideoPlayer {
    constructor() {}

    setVideoSource(src: any) {
        this.pause();
    }

    currentTime = 0;

    private _duration = 0;

    get duration() {
        return this._duration;
    }

    _paused = false;

    get paused() {
        return this._paused;
    }

    play() {
        return new Promise<void>((resolve, reject) => {
            this._paused = false;
            resolve();
        });
    }

    pause() {
        return new Promise<void>((resolve, reject) => {
            this._paused = true;
            resolve();
        });
    }

    get onended() {
        return this.videoElt.onended as TimeChangeEvent;
    }

    set onended(callback: TimeChangeEvent) {
        if (callback) {
            this.videoElt.onended = callback.bind(this);
        } else {
            this.videoElt.onended = null;
        }
    }

    get ontimeupdate() {
        return this.videoElt.ontimeupdate as TimeChangeEvent;
    }

    set ontimeupdate(callback: TimeChangeEvent) {
        if (callback) {
            this.videoElt.ontimeupdate = callback.bind(this);
        } else {
            this.videoElt.ontimeupdate = null;
        }
    }

    get ondurationchange() {
        return this.videoElt.ondurationchange as TimeChangeEvent;
    }

    set ondurationchange(callback: TimeChangeEvent) {
        if (callback) {
            this.videoElt.ondurationchange = callback.bind(this);
        } else {
            this.videoElt.ondurationchange = null;
        }
    }
}
