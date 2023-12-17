import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import { Camera } from '~/renderer/media';

export interface CameraListProps {
    cameras: Camera[];
    selectedCamera: string;
    onChangeCamera: (cameraId: string) => void;
}

export const CameraList = observer(function CameraList(props: CameraListProps) {
    useEffect(function mount() {}, []);

    const handleOnChange = action((deviceId: string) => {
        props.onChangeCamera(deviceId);
    });

    return (
        <select
            value={props.selectedCamera}
            onChange={(ev) => handleOnChange(ev.currentTarget.value)}>
            {props.cameras.map(({ deviceId, label }) => {
                return (
                    <option key={deviceId} value={deviceId}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
});
