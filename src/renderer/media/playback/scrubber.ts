import EventEmitter from 'events';
import { PlaybackOptions } from '~/renderer/media';
import { REFRESH_RATE_IN_MS, SECONDS_PER_FRAME } from '~/renderer/media/constants';
import { Logger, getLog } from '~/renderer/media/logutil';
import { getLocator } from '~/renderer/services';
import TypedEventEmitter from '../eventemitter';
import { Playback } from './playback';

type ScrubberEvents = {
    play: () => void;
    pause: () => void;
    ended: (where: 'start' | 'end') => void;
};

export class Scrubber extends (EventEmitter as new () => TypedEventEmitter<ScrubberEvents>) {
    private logger: Logger;
    private playback: Playback;

    constructor(playback: Playback, public readonly options: PlaybackOptions) {
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

    private get player() {
        const { player } = getLocator();

        return player;
    }

    get paused() {
        if (this.mode === 'normal') {
            return this.player.paused;
        } else {
            return false;
        }
    }

    private mode: 'normal' | 'rewind' | 'slowForward' | 'fastForward' = 'normal';

    async play() {
        this.stopInterval();

        await this.player.play();

        this._speed = 1;
        this.mode = 'normal';

        this.emitPlay();
    }

    async pause() {
        this.stopInterval();

        await this.player.pause();

        this._speed = 0;
        this.mode = 'normal';

        this.emitPause();
    }

    get speed() {
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

        const nextTime = this.playback.currentTime.add(SECONDS_PER_FRAME, 'seconds');

        this.mode = 'normal';

        this.logger.info(`Next frame at ${this.playback.segments.getAsTimecode(nextTime)}`);
        this.playback.goToTime(nextTime);
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

    get isAtMaxFastForwardSpeed() {
        return this._speed >= this.options.maxPlaySpeedFactor;
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

    async onInterval() {
        if (this.playback.isBusyDontTouchThePlayback) {
            console.warn('Playback is busy. Skipping this round.');
            return;
        }

        const currentTime = this.playback.currentTime;

        if (this.deltaInSec === 0) {
            this.logger.info('Unexpected Stop');

            this.stopInterval();

            await this.playback.goToTime(currentTime);
            this.emitPause();
        }

        const nextTime =
            this.deltaInSec >= 0
                ? currentTime.add(this.deltaInSec, 'seconds')
                : currentTime.subtract(this.deltaInSec * -1, 'seconds');

        if (this.playback.isBeforeStart(nextTime) && this.direction === 'backward') {
            this.logger.info('Reached the beginning');

            this.stopInterval();

            await this.playback.goToStart();
            this.emitPause();
            this.emitEnded('start');
        } else if (this.playback.isAfterEnd(nextTime) && this.direction === 'forward') {
            this.logger.info('Reached the end');

            this.stopInterval();

            await this.playback.goToEnd();
            this.emitPause();
            this.emitEnded('end');
        } else {
            await this.playback.goToTime(nextTime);
        }
    }

    private _interval: any = 0;

    private startInterval() {
        const { setInterval } = getLocator().host;

        this.logger.log('Starting playback timer');

        this._interval = this._interval || setInterval(() => this.onInterval(), REFRESH_RATE_IN_MS);
    }

    private stopInterval() {
        if (this._interval !== 0) {
            const { clearInterval } = getLocator().host;

            this.logger.log('Stopping playback timer');

            clearInterval(this._interval);
            this._interval = 0;

            this._speed = 0;
            this.mode = 'normal';
        }
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
