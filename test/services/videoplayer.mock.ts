import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { IVideoPlayer, TimeChangeEvent, getLocator } from '~/renderer/services';
import { MockMediaStreamReader } from './mediastreamreader.mock';

export class MockVideoPlayer implements IVideoPlayer {
    constructor() {}

    public segments: SegmentCollection = null!;

    private src: any = null;

    async setVideoSource(src: any) {
        if (src === null || src == undefined) {
            this.src = null;
            this.currentTime = NaN;
            this._duration = NaN;
        } else if (this.src === src) {
            // No-op
            return;
        } else if (typeof src === 'string') {
            const segment = this.segments.segments.find((s) => s.url === src);

            if (!segment) {
                throw new Error(`There is no mock video data with the URL ${src}`);
            }

            this.src = src;

            // TODO: To emulate the behavior of the video element these
            // probably need to be delayed and put in a timeout
            this.currentTime = 0;
            this._duration = segment.duration;
        } else if (src instanceof MockMediaStreamReader) {
            this.src = src;
            this.currentTime = 0;
            this._duration = Infinity;
        } else if (src instanceof MediaStream) {
            throw new Error(`MockVideoPlayer does not support MediaStream.`);
        } else {
            throw new Error(`MockVideoPlayer does not recognize the source.`);
        }

        return this.pause();
    }

    getVideoSource() {
        return this.src;
    }

    currentTime = 0;

    private _duration = 0;

    get duration() {
        return this._duration;
    }

    private _paused = false;

    get paused() {
        return this._paused;
    }

    private get locator() {
        return getLocator();
    }

    play() {
        return new Promise<void>((resolve, reject) => {
            this._paused = false;

            this.startPlayingInterval();

            resolve();
        });
    }

    pause() {
        return new Promise<void>((resolve, reject) => {
            this._paused = true;
            this.stopPlayingInterval();
            resolve();
        });
    }

    private interval: any = null;
    private durationRaised = false;

    private startPlayingInterval() {
        const { setInterval } = this.locator.host;

        this.interval = this.interval || setInterval(this.onPlayInterval, 250);
    }

    private onPlayInterval = () => {
        this.currentTime = Math.min(this.currentTime + 0.25, this.duration);

        this.ontimeupdate?.();

        if (!this.durationRaised && this.currentTime > 0.25) {
            this.durationRaised = true;
            this.ondurationchange?.();
        }

        if (this.currentTime >= this.duration) {
            this.onended?.();
            this.stopPlayingInterval();
        }
    };

    private stopPlayingInterval() {
        const { clearInterval } = this.locator.host;

        clearInterval(this.interval);
        this.interval = null;
        this.durationRaised = false;
    }

    onended: TimeChangeEvent = null;
    ontimeupdate: TimeChangeEvent = null;
    ondurationchange: TimeChangeEvent = null;
}
