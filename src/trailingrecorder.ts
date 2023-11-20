import { LiveStream } from "./media/livestream";

const mimeType = 'video/webm';

export class TrailingRecorder
{
    private liveStream:LiveStream;
    private recorders:MediaRecorder[] = [];
    private readonly recorderCount = 5;

    constructor(liveStream:LiveStream) {
        this.liveStream = liveStream;
    }

    public get videoElt() { return this.liveStream.videoElt; }

    private interval:any;
    private curr = 0;

    public start()
    {
        for(let i=0; i < this.recorderCount; i++) {
            const recorder = new MediaRecorder(this.liveStream.stream, { mimeType });

            recorder.ondataavailable = this.onDataAvailable;

            this.recorders[i] = recorder;
        }

        this.interval = setInterval(() => {
            console.log('Resetting ' + this.curr);
            const recorder = this.recorders[this.curr];

            recorder.stop();
            recorder.start();

            this.curr = (this.curr + 1) % this.recorderCount;
        }, 5000);
    }

    public stop() {
        this.recorders.forEach(recorder => recorder.stop());
        clearInterval(this.interval);
    }

    private onDataAvailable = (event:BlobEvent) => {
        const blob = event.data;

        // console.log('onDataAvailable ' + this.activeSegmentDuration);
        if (typeof blob === "undefined" || blob.size === 0) {
            return;
        }
    }
}