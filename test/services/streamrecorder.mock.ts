import { IMediaRecorder, OnDataAvailableEvent } from './interfaces';

export class MockStreamRecorder implements IMediaRecorder {
    constructor() {
        // TODO: Add a constructor parameter that takes
        // the filepath or raw data that will be yielded.
    }

    get stream(): any {
        // ТОDO: Return a fake stream of data.  Maybe a raw array?
        throw new Error(`Not implemented`);
    }

    start(timeslice?: number) {
        // TODO: set an interval and periodically yield data
    }

    stop() {
        // TODO: yield the last bit of data and stop the interval
    }

    ondataavailable = () => {};
}
