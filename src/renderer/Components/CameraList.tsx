import { action } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { CameraStore } from './stores';

export interface CameraListProps {
    cameraStore: CameraStore;
    onChangeCamera: (cameraId: string) => void;
}

export const CameraList = observer(function CameraList(props: CameraListProps) {
    const { cameraStore } = props;

    const handleOnChange = action((deviceId: string) => {
        cameraStore.lastSelectedCameraId = deviceId;
        props.onChangeCamera(deviceId);
    });

    return (
        <select
            value={cameraStore.lastSelectedCameraId}
            onChange={(ev) => handleOnChange(ev.currentTarget.value)}>
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
