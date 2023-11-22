export function nowAsSeconds(offset: number) {
    return new Date(new Date().valueOf() - (offset * 1000))
}

export function formatSeconds(seconds: number) {
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