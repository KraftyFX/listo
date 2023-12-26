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

export interface IStreamRecorder {
    readonly stream: any;

    start(timeslice?: number): void;
    stop(): Promise<void>;
    ondataavailable: ((this: IStreamRecorder, ev: BlobEvent) => any) | null;
}

export interface IServiceLocator {
    player: IVideoPlayer;
    recorder: IStreamRecorder;
}