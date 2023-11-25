import React, { useEffect, useState } from 'react';

export interface Camera {
    deviceId: string;
    label: string;
}

export interface CameraListProps {
    onError?: (err: Error) => void;
}

export function CameraList(props: CameraListProps) {
    const [cameras, setCameraList] = useState<Camera[]>([]);

    useEffect(() => {
        const initAsync = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter((d) => d.kind === 'videoinput');

            setCameraList(cameras);
        };

        initAsync().catch(props.onError);
    }, []);

    return (
        <select>
            {cameras.map(({ deviceId, label }) => {
                return <option value={deviceId}>{label}</option>;
            })}
        </select>
    );
}
