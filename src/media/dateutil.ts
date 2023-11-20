export function nowAsSeconds(offset: number) {
    return new Date(new Date().valueOf() - (offset * 1000))
}