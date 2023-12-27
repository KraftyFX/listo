import _merge from 'lodash.merge';
import { IStreamRecorder, OnDataAvailableEvent } from '~/renderer/services';

interface MockStreamRecorderOptions {
    arrayLength: number;
    count: number;
}

const DEFAULT_OPTIONS: MockStreamRecorderOptions = {
    arrayLength: 10,
    count: 1,
};

export class MockStreamRecorder implements IStreamRecorder {
    public readonly options: MockStreamRecorderOptions;

    constructor(options: Partial<MockStreamRecorderOptions> = DEFAULT_OPTIONS) {
        this.options = _merge({}, DEFAULT_OPTIONS, options);
    }

    get stream(): any {
        return this;
    }

    private interval: any = 0;

    start(timeslice?: number) {
        this.count = 0;
        this.interval = setInterval(this.onInterval, 1);
    }

    private count = 0;
    private onInterval = () => {
        if (this.count === this.options.count) {
            this.stopInterval();
        } else {
            this.count++;

            const arr = new Array(this.options.arrayLength).fill(
                this.count,
                0,
                this.options.arrayLength
            );

            const blob = new Blob(arr);

            this.ondataavailable!.call(this, blob);
        }
    };

    async stop() {
        // Ensure there's been one chance to get data before stopping
        this.onInterval();
        this.stopInterval();
    }

    ondataavailable: OnDataAvailableEvent = () => {
        throw new Error(`Not hooked up`);
    };

    private stopInterval() {
        clearInterval(this.interval);
        this.interval = 0;
    }
}
