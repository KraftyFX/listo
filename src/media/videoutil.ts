export function playAndWait(videoElt: HTMLVideoElement) {
    return new Promise<void>((resolve, reject) => {
        if (!isPlaying(videoElt)) {
            console.info('Play');

            // See https://stackoverflow.com/a/37172024 for why this timeout is used.
            setTimeout(() => {
                videoElt.play().then(resolve).catch(reject);
            }, 10);
        } else {
            console.info('Play (no-op)');
            resolve();
        }
    });
}

/**
 * Helper function used to help reduce the risk of "The play() request was
 * interrupted by a call to pause()" exception.
 *
 * For context see:
 *  - https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error
 *  - https://developer.chrome.com/blog/play-request-was-interrupted
 */
function isPlaying(videoElt: HTMLVideoElement) {
    return (
        videoElt.currentTime > 0 &&
        !videoElt.paused &&
        !videoElt.ended &&
        videoElt.readyState > videoElt.HAVE_CURRENT_DATA
    );
}

export function pauseAndWait(videoElt: HTMLVideoElement) {
    return new Promise<void>((resolve) => {
        if (!videoElt.paused) {
            console.info('Pause');
            videoElt.addEventListener('pause', () => resolve(), { once: true });
            videoElt.pause();
        } else {
            console.info('Pause (no-op)');
            resolve();
        }
    });
}
