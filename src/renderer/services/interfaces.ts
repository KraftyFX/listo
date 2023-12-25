export interface IVideoElement {
    setVideoSource(src: any): void;

    currentTime: number;
    readonly duration: number;

    readonly paused: boolean;

    play(): Promise<void>;
    pause(): Promise<void>;

    onended: ((this: IVideoElement) => any) | null;
    ontimeupdate: ((this: IVideoElement) => any) | null;
    ondurationchange: ((this: IVideoElement) => any) | null;
}

export interface IMediaRecorder {
    start(timeslice?: number): void;
    stop(): void;
    ondataavailable: ((this: MediaRecorder, ev: BlobEvent) => any) | null;
}
