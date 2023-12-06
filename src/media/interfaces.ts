export interface Camera {
    deviceId: string;
    label: string;
}

export interface Segment {
    index: number;
    url: string;
    chunks: Blob[];
    startTime: number;
    duration: number;
}

export type PlayerMode = 'live' | 'playback';
