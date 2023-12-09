import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { CameraStore } from '~/Components/stores/cameraStore';
import { DvrStore } from '~/Components/stores/dvrStore';
import { DigitalVideoRecorder } from '~/media/dvr';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { PlaybackControls } from './PlaybackControls';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';

dayjs.extend(duration);

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
            window.dvr = dvr;

            await dvr.showLiveStreamAndStartRecording();
            dvrStore.dvr = dvr;
            window.dvrStore = dvrStore;

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
                    <Timeline
                        dvrStore={dvrStore}
                        viewport={dayjs.duration(dvr.options.viewport)}
                        marker={dvr.options.marker}
                    />
                </>
            )}
        </>
    );
});
