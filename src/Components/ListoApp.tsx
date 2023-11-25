import React, { useEffect, useState } from 'react';
import { CameraList } from './CameraList';
import { VideoPlayer } from './VideoPlayer';
import { Camera } from './interfaces';

export function ListoApp() {
    const [cameras, setCameras] = useState<Camera[]>([]);

    useEffect(() => {
        const initAsync = async () => {
            const cameras = await getCameraList();

            setCameras(cameras);
        };

        initAsync().catch(console.error);
    }, []);

    const handleCameraChange = (camera: Camera) => {
        localStorage.setItem('videoinput', camera.deviceId);
    };

    return (
        <div>
            <CameraList cameras={cameras} cameraId={getSelectedVideoDeviceId()} onChangeCamera={handleCameraChange} />
            <VideoPlayer />
        </div>
    );
}

function getSelectedVideoDeviceId() {
    return localStorage.getItem('videoinput') || 'default';
}

async function getCameraList() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');

    return cameras;
}
