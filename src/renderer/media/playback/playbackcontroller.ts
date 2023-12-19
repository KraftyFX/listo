import EventEmitter from 'events';
import { PlaybackOptions } from '~/renderer/media';
import { REFRESH_RATE_IN_MS, SECONDS_PER_FRAME } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import TypedEventEmitter from '../eventemitter';
import { pauseAndWait, playAndWait } from './playbackutil';
import { SegmentedPlayback } from './segmentedplayback';

type PlaybackControllerEvents = {
    play: () => void;
    pause: () => void;
    ended: (where: 'start' | 'end') => void;
    timeupdate: (time: number) => void;
};

export class PlaybackController extends (EventEmitter as new () => TypedEventEmitter<PlaybackControllerEvents>) {
    private logger: Logger;
    private playback: SegmentedPlayback;

    constructor(playback: SegmentedPlayback, public readonly options: PlaybackOptions) {
        super();

        this.logger = getLog('pbk-cntr', this.options);
        this.playback = playback;
    }

    stop() {
        this.stopInterval();
    }

    private get direction() {
        switch (this.mode) {
            case 'normal':
                return 'normal';
            case 'fastForward':
            case 'slowForward':
                return 'forward';
            case 'rewind':
                return 'backward';
        }
    }

    private get videoElt() {
        return this.playback.videoElt;
    }

    public get paused() {
        if (this.mode === 'normal') {
            return this.videoElt.paused;
        } else {
            return false;
        }
    }

    private mode: 'normal' | 'rewind' | 'slowForward' | 'fastForward' = 'normal';

    async play() {
        this.stopInterval();

        await playAndWait(this.videoElt);

        this._speed = 1;
        this.mode = 'normal';

        this.emitPlay();
    }

    async pause() {
        this.stopInterval();

        await pauseAndWait(this.videoElt);

        this._speed = 0;
        this.mode = 'normal';

        this.emitPause();
    }

    public get speed() {
        return this._speed;
    }
    private _speed = 0;
    private get deltaInSec() {
        return SECONDS_PER_FRAME * this._speed;
    }

    get isAtMaxRewindSpeed() {
        return this._speed <= -1 * this.options.maxPlaySpeedFactor;
    }

    async rewind() {
        if (this.mode !== 'rewind') {
            this._speed = -2;
        } else {
            if (this.isAtMaxRewindSpeed) {
                return;
            }

            this._speed *= 2;
        }

        this.mode = 'rewind';

        this.logger.info(`Rewinding at ${this.speed}x`);

        this.startInterval();
        this.emitPlay();
    }

    async nextFrame() {
        this.stopInterval();

        const nextTimestamp = Math.min(
            this.playback.currentTime + SECONDS_PER_FRAME,
            this.playback.duration
        );

        this.mode = 'normal';

        this.logger.info(`Next frame at ${nextTimestamp.toFixed(3)}`);
        this.emitTimeUpdate(nextTimestamp);
        this.emitPause();
    }

    get isAtMinSlowSpeed() {
        return 0 < this._speed && this._speed <= this.options.minPlaySpeedFactor;
    }

    async slowForward() {
        if (this.mode !== 'slowForward') {
            this._speed = 0.5;
        } else {
            if (this.isAtMinSlowSpeed) {
                return;
            }

            this._speed /= 2;
        }

        this.mode = 'slowForward';

        this.logger.info(`Slow Forwarding at ${this.speed}x`);

        this.startInterval();
        this.emitPlay();
    }

    async fastForward() {
        if (this.mode !== 'fastForward') {
            this._speed = 2;
        } else {
            if (this.isAtMaxFastForwardSpeed) {
                return;
            }

            this._speed *= 2;
        }

        this.mode = 'fastForward';

        this.logger.info(`Forwarding at ${this.speed}x`);

        this.startInterval();
        this.emitPlay();
    }

    get isAtMaxFastForwardSpeed() {
        return this._speed >= this.options.maxPlaySpeedFactor;
    }

    public get isActive() {
        return this._interval !== 0;
    }
    private _interval: any = 0;

    private startInterval() {
        this.logger.log('Starting playback timer');

        this._interval =
            this._interval ||
            setInterval(async () => {
                const nextTimestamp = this.playback.currentTime + this.deltaInSec;

                if (this.deltaInSec === 0) {
                    this.logger.info('Unexpected Stop');

                    this.emitTimeUpdate(this.playback.currentTime);

                    this.stopInterval();
                    this.emitPause();
                } else if (nextTimestamp <= 0 && this.direction === 'backward') {
                    this.logger.info('Reached the beginning');

                    this.stopInterval();

                    this.emitTimeUpdate(0);
                    this.emitPause();
                    this.emitEnded('start');
                } else if (
                    nextTimestamp >= this.playback.duration &&
                    this.direction === 'forward'
                ) {
                    this.logger.info('Reached the end');

                    this.stopInterval();

                    this.emitTimeUpdate(this.playback.duration);
                    this.emitPause();
                    this.emitEnded('end');
                } else {
                    this.emitTimeUpdate(nextTimestamp);
                }
            }, REFRESH_RATE_IN_MS);
    }

    private stopInterval() {
        if (this._interval !== 0) {
            this.logger.log('Stopping playback timer');

            clearInterval(this._interval);
            this._interval = 0;

            this._speed = 0;
            this.mode = 'normal';
        }
    }

    private emitTimeUpdate(timestamp: number) {
        this.logger.log(
            `Updating ${this.direction} to ${timestamp.toFixed(3)}. speed=${this.deltaInSec.toFixed(
                3
            )}, max=${this.playback.duration.toFixed(3)}`
        );
        this.emit('timeupdate', timestamp);
    }

    private emitEnded(where: 'start' | 'end') {
        this.emit('ended', where);
    }

    private emitPlay() {
        this.emit('play');
    }

    private emitPause() {
        this.emit('pause');
    }
}
