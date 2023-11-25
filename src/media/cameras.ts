import { Camera } from './interfaces';

let camerasInit = false;
let cameras: Camera[] = [];

export function getLastSelectedCamera() {
    const deviceId = localStorage.getItem('videoinput') || 'default';

    return cameras.find((c) => c.deviceId === deviceId) || null;
}

export function setLastSelectedCamera(camera: Camera | null) {
    localStorage.setItem('videoinput', camera ? camera.deviceId : 'default');
}

export async function getCameraList() {
    if (!camerasInit) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices.filter((d) => d.kind === 'videoinput');

        camerasInit = true;
    }

    return cameras;
}
