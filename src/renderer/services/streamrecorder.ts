import { IStreamRecorder } from './interfaces';

export type OnDataAvailableEvent = ((this: IStreamRecorder, ev: BlobEvent) => any) | null;

export class StreamRecorder implements IStreamRecorder {
    private readonly recorder: MediaRecorder;

    constructor(public readonly stream: MediaStream, public readonly mimeType: string) {
        this.recorder = new MediaRecorder(this.stream, { mimeType });
        this.recorder.ondataavailable = this.onDataAvailable;
    }

    private onDataAvailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
            this.ondataavailable?.call(this, event);
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
