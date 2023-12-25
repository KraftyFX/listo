import dayjs from 'dayjs';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { DvrOptions } from '~/renderer/media';
import { DigitalVideoRecorder } from '~/renderer/media/dvr';
import { VideoPlayer as Player } from '../services/videoelement';
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
            const options = {
                recording: {
                    source: dvrStore.cameraStore.lastSelectedCameraId,
                },
            } as DvrOptions;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: options.recording.source,
                },
            });

            assertLiveStreamAcquired();

            function assertLiveStreamAcquired() {
                if (!stream) {
                    throw new Error(`User denied access to the camera. Can't acquire live stream.`);
                }
            }

            const player = new Player(videoRef.current);

            dvr = new DigitalVideoRecorder(player, stream, options);
            window.dvr = dvr;

            dvrStore.cameraStore.startWatchingCameraList();

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
