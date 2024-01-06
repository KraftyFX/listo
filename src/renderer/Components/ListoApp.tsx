import dayjs from 'dayjs';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { DEFAULT_RECORDING_OPTIONS } from '~/renderer/media';
import { DigitalVideoRecorder } from '~/renderer/media/dvr';
import { ServiceLocator, setLocator } from '../services';
import { HostService } from '../services/host';
import { ListoService } from '../services/listo';
import { MediaStreamReader } from '../services/mediastreamreader';
import { VideoPlayer as Player } from '../services/videoplayer';
import { CameraList } from './CameraList';
import { PlaybackControls } from './PlaybackControls';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';

let dvr: DigitalVideoRecorder;
const dvrStore = new DvrStore();

export const ListoApp = observer(function ListoApp() {
    const videoRef = useRef<HTMLVideoElement>(null!);

    const [isDvrReady, setIsDvrReady] = useState(false);

    useEffect(function mount() {
        const initAsync = async () => {
            await dvrStore.cameraStore.startWatchingCameraList();

            const liveStream = await getLiveStream(dvrStore.cameraStore.lastSelectedCameraId);
            const { mimeType } = DEFAULT_RECORDING_OPTIONS;

            setLocator(
                new ServiceLocator(
                    new Player(videoRef.current),
                    new MediaStreamReader(liveStream, mimeType),
                    new ListoService(),
                    new HostService()
                )
            );

            dvr = new DigitalVideoRecorder();
            window.dvr = dvr;

            await dvr.showLiveStreamAndStartRecording();
            dvrStore.dvr = dvr;
            window.dvrStore = dvrStore;

            setIsDvrReady(true);
        };

        initAsync().catch(console.error);

        return function dismount() {
            dvrStore.cameraStore.stopWatchingCameraList();
            dvr.dispose();
        };
    }, []);

    const handleStartRecording = action(() => {
        dvrStore.dvr.startRecording();
    });

    const handleStopRecording = action(() => {
        dvrStore.dvr.stopRecording();
    });

    return (
        <>
            <CameraList
                cameras={dvrStore.cameraStore.cameras}
                selectedCamera={dvrStore.cameraStore.lastSelectedCameraId}
                onChangeCamera={(selectedId) => {
                    dvrStore.cameraStore.lastSelectedCameraId = selectedId;
                    location.reload();
                }}
            />
            <VideoPlayer ref={videoRef} />
            {!isDvrReady ? null : (
                <>
                    <PlaybackControls dvrStore={dvrStore} />
                    <Timeline
                        autoScrollTimeout={2000}
                        dvrStore={dvrStore}
                        viewport={dayjs.duration(dvr.options.timeline.viewport)}
                        marker={dvr.options.timeline.marker}
                    />
                    <button onClick={handleStopRecording}>Stop Recording</button>
                    <button onClick={handleStartRecording}>Start Recording</button>
                </>
            )}
        </>
    );
});

async function getLiveStream(deviceId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            deviceId,
        },
    });

    if (!stream) {
        throw new Error(`The user denied access to the camera. Can't acquire live stream.`);
    }

    return stream;
}
