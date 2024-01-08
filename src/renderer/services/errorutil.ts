export function isPlayInterruptDomException(err: any): err is DOMException {
    return err instanceof DOMException && err.message.startsWith('The play() request');
}

export function isNoSupportedSourceDomException(err: any): err is DOMException {
    return (
        err instanceof DOMException &&
        err.message.startsWith('The element has no supported sources')
    );
}

export function isMediaDecodingError(err: any): err is MediaError {
    return err instanceof MediaError && err.code == err.MEDIA_ERR_DECODE;
}
