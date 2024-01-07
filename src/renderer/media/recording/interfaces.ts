import { Dayjs } from 'dayjs';

export interface Recording {
    startTime: Dayjs;
    duration: number;
    isPartial: boolean;
}
