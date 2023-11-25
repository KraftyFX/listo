import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import { Camera } from '~/media';
import { CameraStore } from '~/media/cameraStore';

export interface CameraListProps {
    onChangeCamera?: (camera: Camera) => void;
    onError?: (err: Error) => void;
}

export const CameraList = observer(function CameraList(props: CameraListProps) {
    const cameraStore: CameraStore = CameraStore.instance;

    useEffect(() => {
        const init = async () => {
            await cameraStore.init();
        };

        init().catch(console.error);
    }, []);

    const handleOnChange = action((deviceId: string) => {
        const camera = cameraStore.getCameraByDeviceId(deviceId);
        cameraStore.lastSelectedCamera = camera;

        props.onChangeCamera?.(camera);
    });

    return (
        <select
            onChange={(ev) => handleOnChange(ev.currentTarget.value)}
            value={cameraStore.lastSelectedCamera.deviceId}>
            {cameraStore.cameras.map(({ deviceId, label }) => {
                return (
                    <option key={deviceId} value={deviceId}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
});
