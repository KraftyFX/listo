export function subtractSecondsFromNow(offset: number) {
    return new Date(new Date().valueOf() - offset * 1000);
}

export function secondsSince(value: Date) {
    return (new Date().valueOf() - value.valueOf()) / 1000;
}
