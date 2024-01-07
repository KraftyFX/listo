import { Dayjs } from 'dayjs';

export interface Recording {
    startTime: Dayjs;
    duration: number;
    url: string;
    isPartial: boolean;
}
