import { makeAutoObservable, observable, runInAction } from 'mobx';
import { Camera } from '~/media';

// export const LOGITECH_BRIO_CAMERA_ID =
//     '94f3aff55f18fcaa8238d5ae2437608852fcdeae132d61a15b94f197cf364acb';
// export const BUILT_IN = '5134f09eebf96f0a8bc51de97e5b2bfb78e846b2cb5791c35516010b8350fc18';

export class CameraStore {
    cameras: Camera[] = [];

    constructor() {
        makeAutoObservable<CameraStore, '_lastSelectedCameraId'>(this, {
            _lastSelectedCameraId: observable,
            startWatchingCameraList: false,
            stopWatchingCameraList: false,
        });
    }

    startWatchingCameraList() {
        const loadCameraList = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter((d) => d.kind === 'videoinput');

            runInAction(() => (this.cameras = cameras));
        };

        navigator.mediaDevices.ondevicechange = loadCameraList;
        return loadCameraList();
    }

    stopWatchingCameraList() {
        navigator.mediaDevices.ondevicechange = null;
    }

    private _lastSelectedCameraId!: string;

    get lastSelectedCameraId() {
        if (!this._lastSelectedCameraId) {
            this._lastSelectedCameraId = localStorage.getItem('videoinput') || 'default';
        }

        return this._lastSelectedCameraId!;
    }

    set lastSelectedCameraId(cameraId: string) {
        localStorage.setItem('videoinput', cameraId);
        this._lastSelectedCameraId = cameraId;
    }
}
