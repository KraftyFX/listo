import dayjs from 'dayjs';
import { IHostService, TimerCallback } from '~/renderer/services';

interface TimerConfig {
    idx: number;
    fn: TimerCallback;
    ms: number;
    runAt: number;
    timesRan: number;
    type: 'timeout' | 'interval';
}

export class MockHostService implements IHostService {
    constructor() {}

    timers: TimerConfig[] = [];

    setTimeout = (fn: TimerCallback, ms: number) => {
        return this.addTimer(fn, ms, 'timeout');
    };

    clearTimeout = (handle: number) => {
        if (handle <= 0) {
            return;
        }

        this.timers[this.timers.findIndex((t) => t && t.idx === handle)] = null!;
    };

    setInterval = (fn: TimerCallback, ms: number) => {
        return this.addTimer(fn, ms, 'interval');
    };

    clearInterval = (handle: number) => {
        this.clearTimeout(handle);
    };

    get now() {
        return dayjs().startOf('hour').add(this.totalMs, 'milliseconds');
    }

    private totalMs: number = 0;

    private addTimer(fn: TimerCallback, ms: number, type: 'timeout' | 'interval') {
        const timer: TimerConfig = {
            idx: this.timers.length + 1,
            fn,
            ms,
            runAt: this.totalMs + ms,
            timesRan: 0,
            type,
        };

        // console.log(`setTimeout idx=${timer.idx} ms=${ms}`);
        this.timers.push(timer);

        return timer.idx;
    }

    async advanceTimeBy(ms: number) {
        if (ms <= 0) {
            return;
        }

        const newNow = this.totalMs + ms;

        let timersToFire = this.timers
            .filter((t) => t && t.runAt <= newNow)
            .sort((t1, t2) => t1.runAt - t2.runAt);

        while (timersToFire.length > 0) {
            const timer = timersToFire[0];

            // console.log(`${timer.type} i=${timer.idx}, n=${timer.runAt}`);

            this.totalMs = timer.runAt;

            await timer.fn();

            timer.runAt += timer.ms;
            timer.timesRan++;

            timersToFire = this.timers
                .filter((t) => t && t.runAt <= newNow)
                .sort((t1, t2) => t1.runAt - t2.runAt);

            // console.log(timersToFire.length);
        }

        this.totalMs = newNow;
    }

    private blobs: Blob[] = [];

    createObjectURL(blob: Blob) {
        this.blobs.push(blob);

        return `blob:test://blobs/${this.blobs.length}`;
    }

    revokeObjectURL(url: string) {
        const index = parseInt(url.substring(url.lastIndexOf('/') + 1));

        if (!this.blobs[index]) {
            throw new Error(`The blob was revoked already`);
        }

        this.blobs[index] = null!;
    }
}
