import { IStreamRecorder, OnDataAvailableEvent } from './interfaces';

export class StreamRecorder implements IStreamRecorder {
    private readonly recorder: MediaRecorder;

    constructor(public readonly stream: MediaStream, public readonly mimeType: string) {
        this.recorder = new MediaRecorder(this.stream, { mimeType });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private onDataAvailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
            const data = event.data;

            this.ondataavailable?.call(this, data);
        }
    };

    start(timeslice?: number | undefined): void {
        this.recorder.start(timeslice);
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.recorder.ondataavailable = (event) => {
                this.onDataAvailable(event);
                this.recorder.ondataavailable = this.onDataAvailable;
                resolve();
            };

            this.recorder.stop();
        });
    }

    ondataavailable: OnDataAvailableEvent = null;
}
