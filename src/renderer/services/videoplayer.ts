import { IVideoPlayer, TimeChangeEvent } from './interfaces';

export class VideoPlayer implements IVideoPlayer {
    constructor(public readonly videoElt: HTMLVideoElement) {
        this.videoElt.addEventListener('loadedmetadata', () => console.log('metadata'));
        this.videoElt.addEventListener('durationchange', () => console.log('duration'));
    }

    setVideoSource(src: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (src == null) {
                this.videoElt.srcObject = null;
                this.videoElt.src = '';
            } else if (typeof src === 'string') {
                this.videoElt.srcObject = null;
                this.videoElt.src = src;
            } else if (src instanceof MediaStream) {
                this.videoElt.src = '';
                this.videoElt.srcObject = src;
            } else {
                return reject(new Error(`VideoPlayer source is not supported`));
            }

            resolve();
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

    get paused(): boolean {
        return this.videoElt.paused;
    }

    play(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.isPlaying()) {
                console.info('Play');

                // See https://stackoverflow.com/a/37172024 for why this timeout is needed.
                setTimeout(() => {
                    this.videoElt
                        .play()
                        .then(resolve)
                        .catch((e) => {
                            console.error(e);
                            reject(e);
                        });
                }, 10);
            } else {
                console.info('Play (no-op)');
                resolve();
            }
        });
    }

    /**
     * These heuristics help reduce the risk of "The play() request was interrupted by a call to pause()" exception.
     *
     * For context see:
     *  - https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error
     *  - https://developer.chrome.com/blog/play-request-was-interrupted
     */
    private isPlaying() {
        return (
            this.videoElt.currentTime > 0 &&
            !this.videoElt.paused &&
            !this.videoElt.ended &&
            this.videoElt.readyState > this.videoElt.HAVE_CURRENT_DATA
        );
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
}
