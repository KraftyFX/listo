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

export function pauseAndWait(elt: HTMLMediaElement) {
    return new Promise<void>((resolve) => {
        if (!elt.paused) {
            console.info('Pause');
            elt.addEventListener('pause', () => resolve(), { once: true });
            elt.pause();
        } else {
            console.info('Pause (no-op)');
            resolve();
        }
    });
}
