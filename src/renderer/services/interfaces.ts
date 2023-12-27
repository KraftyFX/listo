export type TimeChangeEvent = ((this: IVideoPlayer) => any) | null;

export interface IVideoPlayer {
    setVideoSource(src: any): void;
    getVideoSource(): any;

    currentTime: number;
    readonly duration: number;

    readonly paused: boolean;

    play(): Promise<void>;
    pause(): Promise<void>;

    onended: TimeChangeEvent;
    ontimeupdate: TimeChangeEvent;
    ondurationchange: TimeChangeEvent;
}

export type OnDataAvailableEvent = ((this: IStreamRecorder, ev: Blob) => any) | null;

export interface IStreamRecorder {
    readonly stream: any;

    start(timeslice?: number): void;
    stop(): Promise<void>;
    ondataavailable: OnDataAvailableEvent;
}

export interface IServiceLocator {
    player: IVideoPlayer;
    recorder: IStreamRecorder;
}
