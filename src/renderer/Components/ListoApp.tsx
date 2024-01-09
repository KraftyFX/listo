import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/renderer/Components/stores';
import { DigitalVideoRecorder } from '~/renderer/media';
import { CameraList } from './CameraList';
import { PlaybackControls } from './PlaybackControls';
import { PlaybackError } from './PlaybackError';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';
import { getLiveStream, initailizeServiceLocator } from './initutil';

export interface ListoAppProps {
    dvrStore: DvrStore;
}

export const ListoApp = observer(function ListoApp(props: ListoAppProps) {
    const videoRef = useRef<HTMLVideoElement>(null!);
    const { dvrStore } = props;

    const [isDvrReady, setIsDvrReady] = useState(false);

    useEffect(function mount() {
        const initAsync = async () => {
            await dvrStore.cameraStore.startWatchingCameraList();
            const cameraId = dvrStore.cameraStore.lastSelectedCameraId;
            const { stream, mimeType } = await getLiveStream(cameraId);

            const { listo } = await initailizeServiceLocator(videoRef, stream, mimeType);

            window.dvr = dvrStore.dvr = new DigitalVideoRecorder();
            window.dvrStore = dvrStore;

            await dvrStore.dvr.switchToLiveStream();

            const recordings = await listo.getRecentRecordings(
                dayjs().startOf('day').toISOString(),
                dayjs().endOf('day').toISOString()
            );

            recordings.forEach(({ startTime, duration, url, hasErrors }) => {
                console.log(startTime.format('h:mm:ssa') + ' ' + duration + 's');
                dvrStore.dvr.addSegment(startTime, duration, url, hasErrors);
            });

            setIsDvrReady(true);
        };

        initAsync().catch(console.error);

        return function dismount() {
            dvrStore.cameraStore.stopWatchingCameraList();
            dvrStore.dvr.dispose();
        };
    }, []);

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
            <PlaybackError dvrStore={dvrStore} />
            <VideoPlayer ref={videoRef} />
            {!isDvrReady ? null : (
                <>
                    <PlaybackControls dvrStore={dvrStore} />
                    <Timeline
                        autoScrollTimeout={2000}
                        dvrStore={dvrStore}
                        viewport={dayjs.duration(dvrStore.dvr.options.timeline.viewport)}
                        marker={dvrStore.dvr.options.timeline.marker}
                    />
                </>
            )}
        </>
    );
});
