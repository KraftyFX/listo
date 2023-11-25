import { makeAutoObservable, runInAction } from 'mobx';
import { Camera } from './interfaces';

const DEFAULT_CAMERA: Camera = { deviceId: 'default', label: 'Default' };

export class CameraStore {
    cameras: Camera[] = [];

    private constructor() {
        makeAutoObservable(this);
    }

    private static _instance: CameraStore;
    static get instance() {
        return !CameraStore._instance
            ? (CameraStore._instance = new CameraStore())
            : CameraStore._instance;
    }

    private _init = false;

    public async init() {
        if (this._init) {
            return;
        }

        navigator.mediaDevices.ondevicechange = () => this.refreshCameraList(false);

        await this.refreshCameraList(true);

        this._init = true;
    }

    private async refreshCameraList(isInit: boolean) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        runInAction(() => {
            this.cameras = devices.filter((d) => d.kind === 'videoinput');

            this._lastSelectedCamera = this.getCameraByDeviceId(localStorage.getItem('videoinput'));
        });
    }

    public getCameraByDeviceId(deviceId: string | null) {
        if (!deviceId) {
            return DEFAULT_CAMERA;
        }

        return this.cameras.find((c) => c.deviceId === deviceId)!;
    }

    private _lastSelectedCamera: Camera = DEFAULT_CAMERA;

    get lastSelectedCamera() {
        if (!this._lastSelectedCamera) {
            runInAction(() => {
                this._lastSelectedCamera = this.getCameraByDeviceId(
                    localStorage.getItem('videoinput')
                );
            });
        }

        return this._lastSelectedCamera!;
    }

    set lastSelectedCamera(camera: Camera) {
        localStorage.setItem('videoinput', camera ? camera.deviceId : 'default');
        this._lastSelectedCamera = camera;
    }

    private assertInit() {
        if (!this._init) {
            throw new Error(`The CameraStore has not been initalized yet`);
        }
    }
}
