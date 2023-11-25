import React from 'react';
import { Camera } from '~/media';

export interface CameraListProps {
    defaultCamera?: Camera | null;
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
        <select
            onChange={(ev) => handleOnChange(ev.currentTarget.value)}
            defaultValue={props.defaultCamera?.deviceId}>
            {props.cameras.map(({ deviceId, label }) => {
                return (
                    <option key={deviceId} value={deviceId}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
}
