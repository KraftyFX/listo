import { Dayjs } from 'dayjs';

export interface Segment {
    index: number;
    url: string;
    startTime: Dayjs;
    duration: number;
    isPartial: boolean;
    blob: Blob;
    hasErrors: boolean;
}
