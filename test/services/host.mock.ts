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

        const onTimeout = (timeout: TimerConfig) => {
            const timesToRun = Math.floor(this.totalMs / timeout.ms);

            for (let i = timeout.timesRan; i < timesToRun; i++) {
                timeout.fn();
            }

            timeout.timesRan = timesToRun;
        };

        this.timeouts.filter((t) => !!t).forEach(onTimeout);
        this.intervals.filter((t) => !!t).forEach(onTimeout);
    }

    intervals: TimerConfig[] = [];

    setInterval = (fn: TimerCallback, ms: number) => {
        this.intervals.push({ fn, ms, timesRan: 0 });
        return this.intervals.length;
    };

    clearInterval = (handle: number) => {
        this.intervals[handle] = null!;
    };
}
