export interface IVideoPlayer {
    setVideoSource(src: any): void;

    currentTime: number;
    readonly duration: number;

    readonly paused: boolean;

    play(): Promise<void>;
    pause(): Promise<void>;

    onended: ((this: IVideoPlayer) => any) | null;
    ontimeupdate: ((this: IVideoPlayer) => any) | null;
    ondurationchange: ((this: IVideoPlayer) => any) | null;
}

export interface IMediaRecorder {
    start(timeslice?: number): void;
    stop(): void;
    ondataavailable: ((this: MediaRecorder, ev: BlobEvent) => any) | null;
}
