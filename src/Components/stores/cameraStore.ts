import { makeAutoObservable } from 'mobx';

export class CameraStore {
    constructor() {
        makeAutoObservable(this);
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
