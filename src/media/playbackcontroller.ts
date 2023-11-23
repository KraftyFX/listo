import EventEmitter from "events";
import { REFRESH_RATE_IN_MS, SECONDS_PER_FRAME } from "./interfaces";
import { SegmentedPlayback } from "./segmentedplayback";
import { pauseAndWait, playAndWait } from "./videoutil";

/*
 * This class exists b/c the HTMLElement.playbackRate property only works forwards, not backwards.
 */
export class PlaybackController extends EventEmitter
{
    private recorder: SegmentedPlayback;

    constructor(recorder: SegmentedPlayback) {
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

    private get videoElt() { return this.recorder.videoElt; }

    public get paused() {
        if (this.mode === 'normal') {
            return this.videoElt.paused;
        } else {
            return false;
        }
    }

    private mode:"normal" | "rewind" | "slowForward" | "fastForward" = "normal";

    async play() {
        this.stopInterval();

        await playAndWait(this.videoElt);

        this.emitPlay();
    }

    async pause() {
        this.stopInterval();
        
        await pauseAndWait(this.videoElt);

        this.emitPause();
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

        this.mode = 'rewind';

        this.info('Rewinding at ' + this.multiplier + 'x');

        this.startInterval();
        this.emitPlay();
    }

    async nextFrame() {
        this.stopInterval();

        const nextTimestamp = this.recorder.currentTime + SECONDS_PER_FRAME;

        if (nextTimestamp > this.recorder.duration) {
            return;
        }

        this.info(`Next frame at ${nextTimestamp.toFixed(3)}`);
        this.emitTimeUpdate(nextTimestamp);
        this.emitPause();
    }

    async slowForward() {
        if (this._speed > 0 && this._multiplier <= (1 / 8)) {
            return;
        }

        if (this._speed <= 0|| this.mode == "fastForward") {
            this._multiplier = 0.5;
            this._speed = SECONDS_PER_FRAME * this._multiplier;
        } else {
            this._multiplier /= 2;
            this._speed /= 2;
        }

        this.mode = 'slowForward';

        this.info('Slow Forwarding at ' + this.multiplier + 'x');

        this.startInterval();
        this.emitPlay();
    }

    async fastForward() {
        if (this.isActive && this._multiplier >= 8) {
            return;
        }

        if (this._speed <= 0 || this.mode == "slowForward") {
            this._multiplier = 1;
            this._speed = SECONDS_PER_FRAME * this._multiplier;
        } else {
            this._multiplier *= 2;
            this._speed *= 2;
        }

        this.mode = 'fastForward';

        this.info('Forwarding at ' + this.multiplier + 'x');

        this.startInterval();
        this.emitPlay();
    }

    public get isActive() { return this._interval !== 0; }
    private _interval:any = 0;

    private startInterval() {
        this.log('Starting playback timer');

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

                this.emitTimeUpdate(0);
                this.emitEnded();
            }
            else if (nextTimestamp >= this.recorder.duration && this.direction === 'forward')
            {
                this.info('Reached the end');

                this.stopInterval();

                this.emitTimeUpdate(this.recorder.duration);
                this.emitFastForwardEndReached();
            }
            else
            {
                this.emitTimeUpdate(nextTimestamp);
            }
        }, REFRESH_RATE_IN_MS);
    }

    private stopInterval() {
        if (this._interval !== 0) {
            this.log('Stopping playback timer');

            clearInterval(this._interval);
            this._interval = 0;        
    
            this._multiplier = 0;
            this._speed = 0;
    
            this.mode = "normal";
        }
    }

    private emitTimeUpdate(timestamp: number) {
        this.log(`Updating ${this.direction} to ${timestamp.toFixed(3)}. speed=${this._speed.toFixed(3)}, max=${this.recorder.duration.toFixed(3)}`);
        this.emit('timeupdate', timestamp);
    }

    private emitFastForwardEndReached() {
        this.emit('fastforwardendreached');
    }

    private emitEnded() {
        this.emit('ended');
    }

    private info(message: string) {
        console.info(message);
    }

    private log(message: string) {
        // console.log(message);
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }
}