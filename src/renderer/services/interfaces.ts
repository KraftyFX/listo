import { Dayjs } from 'dayjs';

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

export type TimerCallback = (...args: any[]) => any;
export type ClearTimerCallback = (handle: number) => void;

export interface IHostService {
    setTimeout: (fn: TimerCallback, ms: number) => number;
    clearTimeout: ClearTimerCallback;

    setInterval: (fn: TimerCallback, ms: number) => number;
    clearInterval: ClearTimerCallback;

    readonly now: Dayjs;
    advanceTimeBy(ms: number): Promise<void>;

    createObjectURL(blob: Blob): string;
    revokeObjectURL(url: string): void;
}

export interface IServiceLocator {
    player: IVideoPlayer;
    recorder: IStreamRecorder;
    host: IHostService;
}
