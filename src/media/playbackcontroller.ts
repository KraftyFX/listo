import EventEmitter from "events";
import { REFRESH_RATE_IN_MS, SECONDS_PER_FRAME } from "./interfaces";
import { LiveStreamRecorder } from "./livestreamrecorder";

/*
 * This class exists b/c the HTMLElement.playbackRate property only works forwards, not backwards.
 */
export class PlaybackController extends EventEmitter
{
    private recorder: LiveStreamRecorder;

    constructor(recorder: LiveStreamRecorder) {
        super();

        this.recorder = recorder;
    }

    stop() {
        this.stopInterval();
    }

    public get direction() {
        switch (this.mode) {
            case "normal":
                return "normal";
            case "fastForward":
            case "slowForward":
                return "forward";
            case "rewind":
                return "backward";
        }
    }

    public get videoElt() { return this.recorder.videoElt; }

    public get mode() { return this._mode; }
    private _mode:"normal" | "rewind" | "slowForward" | "fastForward" = "normal";

    async play() {
        this.stopInterval();

        if (this.videoElt.paused) {
            await new Promise((resolve) => {
                this.videoElt.addEventListener('play', () => resolve, { once : true });
                this.videoElt.play();
            });
        }
    }

    async pause() {
        this.stopInterval();
        
        if (this.videoElt.paused) {
            return;
        }

        await new Promise((resolve) => {
            this.videoElt.addEventListener('pause', () => resolve, { once: true });
            this.videoElt.pause();
        });
    }

    public get multiplier() { return this._multiplier; }
    private _multiplier = 0;
    private _speed = 0;

    async rewind() {
        if (this.isActive && this._multiplier <= -8) {
            return;
        }

        if (this._speed >= 0) {
            this._multiplier = -1;
            this._speed = SECONDS_PER_FRAME * this._multiplier;
        } else {
            this._multiplier *= 2;
            this._speed *= 2;
        }

        this._mode = 'rewind';

        this.info('Rewinding at ' + this.multiplier + 'x');

        this.startInterval();
    }

    async nextFrame() {
        this.stopInterval();

        const nextTimestamp = this.recorder.currentTime + SECONDS_PER_FRAME;

        if (nextTimestamp > this.recorder.duration) {
            return;
        }

        this.info(`Next frame at ${nextTimestamp.toFixed(3)}`);
        this.emitTimestampUpdate(nextTimestamp);
    }

    async slowForward() {
        if (this._speed > 0 && this._multiplier <= (1 / 8)) {
            return;
        }

        if (this._speed <= 0|| this._mode == "fastForward") {
            this._multiplier = 0.5;
            this._speed = SECONDS_PER_FRAME * this._multiplier;
        } else {
            this._multiplier /= 2;
            this._speed /= 2;
        }

        this._mode = 'slowForward';

        this.info('Slow Forwarding at ' + this.multiplier + 'x');

        this.startInterval();
    }

    async fastForward() {
        if (this.isActive && this._multiplier >= 8) {
            return;
        }

        if (this._speed <= 0 || this._mode == "slowForward") {
            this._multiplier = 1;
            this._speed = SECONDS_PER_FRAME * this._multiplier;
        } else {
            this._multiplier *= 2;
            this._speed *= 2;
        }

        this._mode = 'fastForward';

        this.info('Forwarding at ' + this.multiplier + 'x');

        this.startInterval();
    }

    public get isActive() { return this._interval !== 0; }
    private _interval:any = 0;

    private startInterval() {
        this._interval = this._interval || setInterval(async () => {
            const nextTimestamp = this.recorder.currentTime + this._speed;

            if (this._speed === 0)
            {
                this.info('Unexpected Stop');
                this.stopInterval();
            } 
            else if (nextTimestamp <= 0 && this.direction === 'backward')
            {
                this.info('Reached the beginning');

                this.stopInterval();

                this.emitTimestampUpdate(0);
                this.emitRewindStartReached();
            }
            else if (nextTimestamp >= this.recorder.duration && this.direction === 'forward')
            {
                this.info('Reached the end');

                this.stopInterval();

                this.emitTimestampUpdate(this.recorder.duration);
                this.emitFastForwardEndReached();
            }
            else
            {
                this.emitTimestampUpdate(nextTimestamp);
            }
        }, REFRESH_RATE_IN_MS);
    }

    private emitTimestampUpdate(timestamp: number) {
        this.log(`Updating ${this.direction} to ${timestamp.toFixed(3)}. speed=${this._speed.toFixed(3)}, max=${this.recorder.duration.toFixed(3)}`);
        this.emit('timestampupdate', timestamp);
    }

    private emitFastForwardEndReached() {
        this.emit('fastforwardendreached');
    }

    private emitRewindStartReached() {
        this.emit('rewindstartreached');
    }

    private info(message: string) {
        console.info(message);
    }

    private log(message: string) {
        // console.log(message);
    }

    private stopInterval() {
        clearInterval(this._interval);
        this._interval = 0;        

        this._multiplier = 0;
        this._speed = 0;

        this._mode = "normal";
    }
}