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

    stop(): void {
        this.recorder.stop();
    }

    get ondataavailable() {
        return this.recorder.ondataavailable as OnDataAvailableEvent;
    }

    set ondataavailable(callback: OnDataAvailableEvent) {
        if (callback) {
            this.recorder.ondataavailable = callback.bind(this);
        } else {
            this.recorder.ondataavailable = null;
        }
    }
}
