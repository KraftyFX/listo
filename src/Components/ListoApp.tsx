import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { CameraList } from './CameraList';
import { VideoPlayer } from './VideoPlayer';

export const ListoApp = observer(function ListoApp() {
    const videoRef = useRef(null);

    useEffect(() => {
        const initAsync = async () => {
            console.log(videoRef);
        };

        initAsync().catch(console.error);
    }, []);

    return (
        <>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer ref={videoRef} />
        </>
    );
});
