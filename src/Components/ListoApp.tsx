import { observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { VideoPlayer } from './VideoPlayer';

export const ListoApp = observer(function ListoApp() {
    const videoRef = useRef<HTMLVideoElement>(null!);

    useEffect(function mount() {
        const initAsync = async () => {
            const options = {
                recording: {
                    source: new CameraStore().lastSelectedCameraId,
                },
            } as DvrOptions;

            console.log(videoRef.current);

            const dvr = new DigitalVideoRecorder(videoRef.current, options);

            // await dvr.showLiveStreamAndStartRecording();
        };

        initAsync().catch(console.error);

        return function dismount() {};
    }, []);

    return (
        <>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer ref={videoRef} />
        </>
    );
});
