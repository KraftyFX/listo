import { isNoSupportedSourceDomException, isPlayInterruptDomException } from './errorutil';
import { IVideoPlayer, TimeChangeEvent } from './interfaces';

export class VideoPlayer implements IVideoPlayer {
    constructor(public readonly videoElt: HTMLVideoElement) {
        videoElt.onplaying = () => (this._isPlaying = true);
        videoElt.onpause = () => (this._isPlaying = false);
    }

    setVideoSource(src: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (src == null) {
                this.videoElt.srcObject = null;
                this.videoElt.src = '';

                return resolve();
            }

            this.videoElt.addEventListener('loadeddata', () => resolve(), { once: true });

            if (typeof src === 'string') {
                this.videoElt.srcObject = null;
                this.videoElt.src = src;
            } else if (src instanceof MediaStream) {
                this.videoElt.src = '';
                this.videoElt.srcObject = src;
            } else {
                return reject(new Error(`VideoPlayer source is not supported`));
            }
        });
    }

    getVideoSource() {
        return this.videoElt.src || this.videoElt.srcObject;
    }

    get currentTime(): number {
        return this.videoElt.currentTime;
    }

    set currentTime(value: number) {
        this.videoElt.currentTime = value;
    }

    get duration(): number {
        return this.videoElt.duration;
    }

    private _isPlaying = false;

    get paused(): boolean {
        return this.videoElt.paused;
    }

    play(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isPlaying()) {
                console.info('Play (no-op)');
                return resolve();
            }

            // The timeout helps reduce the risk of "The play() request was interrupted by a call to pause()"
            // DOMException that gets thrown a lot when switching to a new video and invoking `play()`.
            setTimeout(() => {
                this.videoElt
                    .play()
                    .then(resolve)
                    .catch((err) => {
                        // Despite the isPlaying() check and timeout we still got the error :(.
                        if (isPlayInterruptDomException(err)) {
                            resolve();
                        } else if (isNoSupportedSourceDomException(err)) {
                            resolve();
                        } else {
                            console.warn(err);
                            reject(err);
                        }
                    });
            }, 10);
        });
    }

    /**
     * These heuristics help reduce the frequency of "The play() request was interrupted by a call to pause()" exception.
     *
     * For context see:
     *  - https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error
     *  - https://developer.chrome.com/blog/play-request-was-interrupted
     */
    private isPlaying() {
        return !this.videoElt.paused && this._isPlaying;
    }

    pause(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.videoElt.paused) {
                console.info('Pause');
                this.videoElt.addEventListener('pause', () => resolve(), { once: true });
                this.videoElt.pause();
            } else {
                console.info('Pause (no-op)');
                resolve();
            }
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

    get onerror() {
        return this.videoElt.onerror as (err: any) => any;
    }

    set onerror(callback: ((err: any) => any) | null) {
        if (callback) {
            this.videoElt.onerror = () => callback(this.videoElt.error);
        } else {
            this.videoElt.onerror = null;
        }
    }
}
