import { Dayjs } from 'dayjs';
import { DurationUnitsObjectType } from 'dayjs/plugin/duration';
import { MarkerConfig } from '~/renderer/media';

export function getPlayTime(currentTime: Dayjs, speed: number) {
    const parts = [];

    parts.push(currentTime.format('h:mm:ss'));

    if (speed !== 1 && speed !== 0) {
        parts.push('@ ' + speed + 'x');
    }

    return parts.join(' ');
}

export const markerFormats: MarkerConfig[] = [
    minsec(1, 5),
    minsec(1, 15),
    minsec(1, 30),

    minmin(5, 1),
    minmin(10, 5),
    minmin(15, 5),

    minmin(30, 5),
    minmin(30, 10),
    minmin(30, 15),

    hourmin(1, 5),
    hourmin(1, 15),
    hourmin(1, 30),
];

export function markerConfigEquals(a: MarkerConfig, b: MarkerConfig) {
    return durationTypeEquals(a.major, b.major) && durationTypeEquals(a.minor, b.minor);
}

function durationTypeEquals(a: DurationUnitsObjectType, b: DurationUnitsObjectType) {
    return a.minutes === b.minutes && a.seconds === b.seconds && a.hours === b.hours;
}

function minsec(minutes: number, seconds: number) {
    return { major: { minutes }, minor: { seconds } };
}

function minmin(minutes1: number, minutes: number) {
    return { major: { minutes: minutes1 }, minor: { minutes } };
}

function hourmin(hours: number, minutes: number) {
    return { major: { hours }, minor: { minutes } };
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

        return (
            hasHourMajor &&
            hasMinMinor &&
            assertIsEvenlyDivisible(major.hours! * 60, minor.minutes!)
        );
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
            hasMinMajor &&
            hasSecMinor &&
            assertIsEvenlyDivisible(major.minutes! * 60, minor.seconds!)
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
