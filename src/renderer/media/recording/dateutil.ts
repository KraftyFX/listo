import dayjs, { Dayjs } from 'dayjs';

export function durationSince(time: Dayjs) {
    return dayjs.duration(dayjs().diff(time));
}
