export function playAndWait(elt: HTMLMediaElement) {
    return new Promise<void>((resolve) => {
        if (elt.paused) {
            elt.addEventListener('play', () => resolve(), { once: true });
            elt.play();
        } else {
            resolve();
        }
    });
}

export function pauseAndWait(elt: HTMLMediaElement) {
    return new Promise<void>((resolve) => {
        if (!elt.paused) {
            elt.addEventListener('pause', () => resolve(), { once: true });
            elt.pause();
        } else {
            resolve();
        }
    });
}
