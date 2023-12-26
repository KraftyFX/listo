import { IVideoPlayer, TimeChangeEvent } from '~/renderer/services';

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

    onended: TimeChangeEvent = null;
    ontimeupdate: TimeChangeEvent = null;
    ondurationchange: TimeChangeEvent = null;
}
