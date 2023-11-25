import React, { useEffect, useState } from 'react';
import { Camera } from '~/media';
import { getCameraList, getLastSelectedCamera, setLastSelectedCamera } from '~/media/cameras';
import { CameraList } from './CameraList';
import { VideoPlayer } from './VideoPlayer';

export function ListoApp() {
    const [cameras, setCameras] = useState<Camera[]>([]);

    useEffect(() => {
        const initAsync = async () => {
            const cameras = await getCameraList();

            setCameras(cameras);
        };

        initAsync().catch(console.error);
    }, []);

    return (
        <div>
            <CameraList
                cameras={cameras}
                defaultCamera={getLastSelectedCamera()}
                onChangeCamera={(camera) => setLastSelectedCamera(camera)}
            />
            <VideoPlayer />
        </div>
    );
}
