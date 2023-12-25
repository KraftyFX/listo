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

export interface IStreamRecorder {
    readonly stream: any;

    start(timeslice?: number): void;
    stop(): void;
    ondataavailable: ((this: IStreamRecorder, ev: BlobEvent) => any) | null;
}

export interface IServiceLocator {
    player: IVideoPlayer;
    recorder: IStreamRecorder;
}
