import { Dayjs } from 'dayjs';
import { MarkerConfig } from '~/renderer/media';

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

export function getMarkerFormat(markerSize: MarkerConfig, time: Dayjs) {
    if (isHourMinStyle(markerSize)) {
        return getHourMinFormat(markerSize, time);
    } else if (isMinMinStyle(markerSize)) {
        return getMinMinFormat(markerSize, time);
    } else if (isMinSecStyle(markerSize)) {
        return getMinSecFormat(markerSize, time);
    } else {
        throw new Error(`Can't decipher how to format the markers`);
    }
}

function isSet(value?: number): value is number {
    return value !== null && value !== undefined;
}

function assertIsEvenlyDivisible(a: number, b: number) {
    if (a % b !== 0) {
        throw new Error(`${a} is not divisible by ${b}`);
    }

    return true;
}

function isHourMinStyle({ major, minor }: MarkerConfig) {
    try {
        const hasHourMajor = isSet(major.hours) && !isSet(major.minutes);
        const hasMinMinor = !isSet(minor.hours) && isSet(minor.minutes);

        return hasHourMajor && hasMinMinor && assertIsEvenlyDivisible(major.hours!, minor.minutes!);
    } catch (e) {
        throw new Error(`The hour/minute configuration is invalid. ${e}`);
    }
}

function getMinMinFormat({ major, minor }: MarkerConfig, time: Dayjs) {
    if (time.minute() === 0 && time.second() === 0) {
        return { type: 'major', format: time.format('ha') };
    } else if (time.minute() % (major.minutes ?? 0) === 0) {
        return { type: 'major', format: time.format('h:mma') };
    } else if (time.second() % (minor.minutes ?? 0) === 0) {
        return { type: 'minor', format: time.format('m') };
    } else {
        throw new Error(`Not sure how to render a min-min marker for ${time.format()}`);
    }
}

function isMinMinStyle({ major, minor }: MarkerConfig) {
    try {
        const hasMinMajor = !isSet(major.hours) && isSet(major.minutes);
        const hasMinMinor = !isSet(minor.hours) && isSet(minor.minutes);

        return (
            hasMinMajor && hasMinMinor && assertIsEvenlyDivisible(major.minutes!, minor.minutes!)
        );
    } catch (e) {
        throw new Error(`The hour/minute configuration is invalid. ${e}`);
    }
}

function getHourMinFormat({ minor }: MarkerConfig, time: Dayjs) {
    if (time.minute() === 0 && time.second() === 0) {
        return { type: 'major', format: time.format('ha') };
    } else if (time.second() % (minor.minutes ?? 0) === 0) {
        return { type: 'minor', format: time.format('m') };
    } else {
        throw new Error(`Not sure how to render an hour-min marker for ${time.format()}`);
    }
}

function isMinSecStyle({ major, minor }: MarkerConfig) {
    try {
        const hasMinMajor = isSet(major.minutes) && !isSet(major.seconds);
        const hasSecMinor = !isSet(minor.minutes) && isSet(minor.seconds);

        return (
            hasMinMajor && hasSecMinor && assertIsEvenlyDivisible(major.minutes!, minor.seconds!)
        );
    } catch (e) {
        throw new Error(`The hour/minute configuration is invalid. ${e}`);
    }
}

function getMinSecFormat({ minor }: MarkerConfig, time: Dayjs) {
    if (time.second() === 0) {
        if (time.hour() === 0) {
            return { type: 'major', format: time.format('ha') };
        } else {
            return { type: 'major', format: time.format('h:mma') };
        }
    } else if (time.second() % (minor.seconds ?? 0) === 0) {
        return { type: 'minor', format: time.format('ss') + 's' };
    } else {
        throw new Error(`Not sure how to render a min-sec marker for ${time.format()}`);
    }
}