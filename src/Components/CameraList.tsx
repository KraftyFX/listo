import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { Camera } from '~/media';
import { CameraStore } from '~/media/cameraStore';

export interface CameraListProps {
    cameras?: Camera[];
    selectedCamera?: string;
    onChangeCamera?: (cameraId: string) => void;
    onError?: (err: Error) => void;
}

export const CameraList = observer(function CameraList(props: CameraListProps) {
    const cameraStore = new CameraStore();

    const [cameras, setCameras] = useState<Camera[]>(props.cameras || []);
    const [selectedCamera, setSelectedCamera] = useState(
        props.selectedCamera || cameraStore.lastSelectedCameraId
    );

    useEffect(function mount() {
        const init = async () => {
            if (!props.cameras) {
                navigator.mediaDevices.ondevicechange = async () => await refreshCameraList();
                await refreshCameraList();
            }
        };

        init().catch(console.error);

        return function dismount() {
            navigator.mediaDevices.ondevicechange = null;
        };
    }, []);

    async function refreshCameraList() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === 'videoinput');

        setCameras(cameras);
    }

    const handleOnChange = action((deviceId: string) => {
        cameraStore.lastSelectedCameraId = deviceId;
        setSelectedCamera(deviceId);

        props.onChangeCamera?.(deviceId);
    });

    return (
        <select value={selectedCamera} onChange={(ev) => handleOnChange(ev.currentTarget.value)}>
            {cameras.map(({ deviceId, label }) => {
                return (
                    <option key={deviceId} value={deviceId}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
});
