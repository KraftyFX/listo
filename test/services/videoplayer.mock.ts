import { IVideoPlayer, TimeChangeEvent } from '~/renderer/services';
import { MockMediaStreamReader } from './mediastreamreader.mock';

export class MockVideoPlayer implements IVideoPlayer {
    constructor() {}

    private src: any = null;

    setVideoSource(src: any) {
        if (src === null || src == undefined) {
            this.src = null;
        }

        if (this.src === src) {
            return;
        } else if (typeof src === 'string') {
            this.src = src;
        } else if (src instanceof MockMediaStreamReader) {
            this.src = src;
        } else if (src instanceof MediaStream) {
            throw new Error(`MockVideoPlayer does not support MediaStream.`);
        } else {
            throw new Error(`MockVideoPlayer does not recognize the source.`);
        }

        this.pause();
    }

    getVideoSource() {
        return this.src;
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
