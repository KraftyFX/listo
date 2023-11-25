import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import { CameraList } from './CameraList';
import { VideoPlayer } from './VideoPlayer';

export const ListoApp = observer(function ListoApp() {
    useEffect(() => {
        const initAsync = async () => {};

        initAsync().catch(console.error);
    }, []);

    return (
        <div>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer />
        </div>
    );
});
