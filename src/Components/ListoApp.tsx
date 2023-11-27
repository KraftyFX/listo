import { action } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrStore } from '~/media/dvrStore';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { PlaybackCommands, PlaybackControls } from './PlaybackContols';
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

    const onCommand = action((command: PlaybackCommands) => {
        switch (command) {
            case 'rewind':
                dvr.rewind();
                break;
            case 'play':
                dvr.play();
                break;
            case 'pause':
                dvr.pause();
                break;
            case 'fastForward':
                dvr.fastForward();
                break;
            case 'slowForward':
                dvr.slowForward();
                break;
            case 'nextFrame':
                dvr.nextFrame();
                break;
        }
    });

    return (
        <>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer ref={videoRef} />
            {!isDvrReady ? null : (
                <>
                    <PlaybackControls dvrStore={dvrStore} onCommand={onCommand} />
                    <Timeline
                        onGoLive={() => dvr.switchToLiveStream()}
                        onSnapToTime={() => dvr.goToPlaybackTime(0.5)}
                        currentTime={dvrStore.currentTime}
                        duration={dvrStore.duration}
                        speed={dvrStore.speed}
                    />
                </>
            )}
        </>
    );
});
