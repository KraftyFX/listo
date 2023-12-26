export type TimeChangeEvent = ((this: IVideoPlayer) => any) | null;

export interface IVideoPlayer {
    setVideoSource(src: any): void;

    currentTime: number;
    readonly duration: number;

    readonly paused: boolean;

    play(): Promise<void>;
    pause(): Promise<void>;

    onended: TimeChangeEvent;
    ontimeupdate: TimeChangeEvent;
    ondurationchange: TimeChangeEvent;
}

export interface IMediaRecorder {
    start(timeslice?: number): void;
    stop(): void;
    ondataavailable: ((this: MediaRecorder, ev: BlobEvent) => any) | null;
}
