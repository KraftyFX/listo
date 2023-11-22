export function playAndWait(elt:HTMLMediaElement) {
    return new Promise((resolve) => {
        elt.addEventListener('playing', () => resolve, { once: true });
        elt.play();
    });
}

export function pauseAndWait(elt:HTMLMediaElement) {
    return new Promise((resolve) => {
        elt.addEventListener('pause', () => resolve, { once: true });
        elt.pause();
    });
}