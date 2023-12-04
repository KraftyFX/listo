import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { DvrStore } from '~/Components/stores/dvrStore';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { PlaybackControls } from './PlaybackContols';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';
import { TimelineStore } from './stores/timelineStore';

dayjs.extend(duration);

let dvr: DigitalVideoRecorder;
const dvrStore = new DvrStore();
const timeline = new TimelineStore(dvrStore, []);

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
                    <Timeline
                        dvrStore={dvrStore}
                        timeline={timeline}
                        viewportDuration={dayjs.duration({ minutes: 1 })}
                        markerDuration={dayjs.duration({ seconds: 10 })}
                        onSnapToTime={() => dvr.goToPlaybackTime(0.5)}
                    />
                </>
            )}
        </>
    );
});
