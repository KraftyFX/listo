import dayjs from 'dayjs';

export function getPlayTime(currentTime: number, duration: number, speed: number) {
    const parts = [];

    if (currentTime === duration) {
        parts.push(getPlaytimeFormat(currentTime));
    } else {
        parts.push(getPlaytimeFormat(currentTime) + ' / ' + getPlaytimeFormat(duration));
    }

    if (speed !== 1 && speed !== 0) {
        parts.push('@ ' + speed + 'x');
    }

    return parts.join(' ');
}

export function getPlaytimeFormat(seconds: number) {
    const date = new Date(0);
    date.setSeconds(seconds);
    const format = date.toISOString().substring(11, 19);

    if (format.startsWith('00:00:')) {
        return format.substring(6);
    } else if (format.startsWith('00:')) {
        return format.substring(3);
    } else {
        return format;
    }
}

export function getMarkerFormat(time: dayjs.Dayjs) {
    if (time.minute() === 0 && time.second() === 0) {
        // Example: 11pm
        return time.format('ha');
    } else if (time.second() === 0) {
        // Example: 11:20pm
        return time.format('hh:mma');
    } else if (time.second() % 10 === 0) {
        // Example: 30s
        return time.format('ss') + `s`;
    } else {
        return '???';
    }
}
