import { IHostService, TimerCallback } from '~/renderer/services';

interface TimerConfig {
    fn: TimerCallback;
    timesRan: number;
    start: number;
    ms: number;
    type: 'timeout' | 'interval';
}

export class MockHostService implements IHostService {
    constructor() {}

    timers: TimerConfig[] = [];

    setTimeout = (fn: TimerCallback, ms: number) => {
        this.timers.push({ fn, ms, start: this.totalMs, timesRan: 0, type: 'timeout' });
        const idx = this.timers.length;

        // console.log(`setTimeout idx=${idx} ms=${ms}`);

        return idx;
    };

    clearTimeout = (handle: number) => {
        if (handle <= 0) {
            return;
        }

        this.timers[handle - 1] = null!;
    };

    private totalMs: number = 0;

    async advanceTimeBy(ms: number) {
        this.totalMs += ms;

        for (let i = 0; i < this.timers.length; i++) {
            const timer = this.timers[i];

            await this.onTimeout(timer, i);
        }
    }

    onTimeout = async (timeout: TimerConfig, idx: number) => {
        if (!timeout) {
            return;
        }

        const totalTimesToRun = Math.floor((this.totalMs - timeout.start) / timeout.ms);

        for (let n = timeout.timesRan; n < totalTimesToRun; n++) {
            // console.log(`${timeout.type} i=${idx + 1}, n=${n}`);
            await timeout.fn();
        }

        timeout.timesRan = totalTimesToRun;
    };

    setInterval = (fn: TimerCallback, ms: number) => {
        this.timers.push({ fn, ms, start: this.totalMs, timesRan: 0, type: 'interval' });
        const idx = this.timers.length;

        // console.log(`setInterval idx=${idx} ms=${ms}`);

        return idx;
    };

    clearInterval = (handle: number) => {
        if (handle <= 0) {
            return;
        }

        this.timers[handle - 1] = null!;
    };
}
