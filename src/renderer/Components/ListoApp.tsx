import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/renderer/Components/stores';
import { DigitalVideoRecorder } from '~/renderer/media';
import { getLocator } from '../services';
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
            await initCoreServices();
            await initDvr();

            await dvrStore.dvr.switchToLiveStream();

            await loadRecordingsFromEarlierToday();

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
                cameraStore={dvrStore.cameraStore}
                onChangeCamera={() => location.reload()}
            />
            <PlaybackError dvrStore={dvrStore} />
            <VideoPlayer ref={videoRef} />
            {!isDvrReady ? null : (
                <>
                    <PlaybackControls dvrStore={dvrStore} />
                    <Timeline dvrStore={dvrStore} />
                </>
            )}
        </>
    );

    async function initCoreServices() {
        const { cameraStore } = dvrStore;

        await dvrStore.cameraStore.startWatchingCameraList();
        const { stream, mimeType } = await getLiveStream(cameraStore.lastSelectedCameraId);

        await initailizeServiceLocator(videoRef, stream, mimeType);
    }

    async function initDvr() {
        const dvr = new DigitalVideoRecorder();

        dvrStore.dvr = dvr;
        window.dvr = dvr;
    }

    async function loadRecordingsFromEarlierToday() {
        const { listo } = getLocator();

        const recordings = await listo.getRecentRecordings(
            dayjs().startOf('day'),
            dayjs().endOf('day')
        );

        recordings.forEach(({ startTime, duration, url, hasErrors }) => {
            console.log(startTime.format('h:mm:ssa') + ' ' + duration + 's');
            dvrStore.dvr.addSegment(startTime, duration, url, hasErrors);
        });
    }
});
