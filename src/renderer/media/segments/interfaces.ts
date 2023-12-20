import { Dayjs } from 'dayjs';

export interface Segment {
    index: number;
    url: string;
    startTime: Dayjs;
    startOffset: number;
    duration: number;
}
