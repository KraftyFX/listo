import React from 'react';
import { Camera } from './interfaces';

export interface CameraListProps {
    cameraId?: string;
    cameras: Camera[];
    onChangeCamera?: (camera: Camera) => void;
    onError?: (err: Error) => void;
}

export function CameraList(props: CameraListProps) {
    const handleOnChange = (deviceId: string) => {
        const camera = props.cameras.filter((c) => c.deviceId === deviceId)[0];

        props.onChangeCamera?.(camera);
    };

    return (
        <select onChange={(ev) => handleOnChange(ev.currentTarget.value)}>
            {props.cameras.map(({ deviceId, label }) => {
                return (
                    <option value={deviceId} selected={props.cameraId === deviceId}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
}
