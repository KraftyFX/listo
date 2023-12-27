import { IHostService, TimerCallback } from '~/renderer/services';

interface TimerConfig {
    fn: TimerCallback;
    timesRan: number;
    ms: number;
}

export class MockHostService implements IHostService {
    constructor() {}

    timeouts: TimerConfig[] = [];

    setTimeout = (fn: TimerCallback, ms: number) => {
        this.timeouts.push({ fn, ms, timesRan: 0 });
        return this.timeouts.length;
    };

    clearTimeout = (handle: number) => {
        this.timeouts[handle] = null!;
    };

    private totalMs: number = 0;

    advanceTimersBy(ms: number) {
        this.totalMs += ms;

        // TODO: Probably want to do these in parallel based on time
        // vs sequentially like this.
        this.timeouts.filter((t) => !!t).forEach(this.onTimeout);
        this.intervals.filter((t) => !!t).forEach(this.onTimeout);
    }

    onTimeout = (timeout: TimerConfig) => {
        const totalTimesToRun = Math.floor(this.totalMs / timeout.ms);

        for (let i = timeout.timesRan; i < totalTimesToRun; i++) {
            timeout.fn();
        }

        timeout.timesRan = totalTimesToRun;
    };

    intervals: TimerConfig[] = [];

    setInterval = (fn: TimerCallback, ms: number) => {
        this.intervals.push({ fn, ms, timesRan: 0 });
        return this.intervals.length;
    };

    clearInterval = (handle: number) => {
        this.intervals[handle] = null!;
    };
}
