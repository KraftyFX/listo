import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrStore } from '~/media/dvrStore';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { PlaybackControls } from './PlaybackContols';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';

let dvr: DigitalVideoRecorder;
const dvrStore = new DvrStore();

export const ListoApp = observer(function ListoApp() {
    const videoRef = useRef<HTMLVideoElement>(null!);

    const [isDvrReady, setIsDvrReady] = useState(false);

    useEffect(function mount() {
        const initAsync = async () => {
            const options = {
                recording: {
                    source: new CameraStore().lastSelectedCameraId,
                },
            } as DvrOptions;

            dvr = new DigitalVideoRecorder(videoRef.current, options);

            await dvr.showLiveStreamAndStartRecording();
            dvrStore.init(dvr);

            setIsDvrReady(true);
        };

        initAsync().catch(console.error);

        return function dismount() {
            dvr.removeAllListeners();
        };
    }, []);

    return (
        <>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer ref={videoRef} />
            {!isDvrReady ? null : (
                <>
                    <PlaybackControls dvrStore={dvrStore} />
                    <Timeline onSnapToTime={() => dvr.goToPlaybackTime(0.5)} />
                </>
            )}
        </>
    );
});
