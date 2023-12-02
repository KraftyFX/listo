export function playAndWait(videoElt: HTMLMediaElement) {
    return new Promise<void>((resolve) => {
        if (videoElt.paused) {
            console.info('Play');
            videoElt.addEventListener('play', () => resolve(), { once: true });
            videoElt.play();
        } else {
            console.info('Play (no-op)');
            resolve();
        }
    });
}

export function pauseAndWait(videoElt: HTMLMediaElement) {
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
