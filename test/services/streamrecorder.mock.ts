import { IStreamRecorder } from '~/renderer/services';

export class MockStreamRecorder implements IStreamRecorder {
    constructor() {
        // TODO: Add a constructor parameter that takes
        // the filepath or raw data that will be yielded.
    }

    get stream(): any {
        return this;
    }

    start(timeslice?: number) {
        // TODO: set an interval and periodically yield data
    }

    async stop() {
        // TODO: yield the last bit of data and stop the interval
    }

    ondataavailable = () => {};
}
