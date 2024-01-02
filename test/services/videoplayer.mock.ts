import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { IVideoPlayer, TimeChangeEvent } from '~/renderer/services';
import { MockMediaStreamReader } from './mediastreamreader.mock';

export class MockVideoPlayer implements IVideoPlayer {
    constructor() {}

    public segments: SegmentCollection = null!;

    private src: any = null;

    setVideoSource(src: any) {
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

        setTimeout(() => {
            this.ontimeupdate?.();
            this.ondurationchange?.();
        }, 0);

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
