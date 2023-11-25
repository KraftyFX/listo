import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { LiveStreamCommands, LiveStreamControls } from './LiveStreamControls';
import { PlaybackCommands, PlaybackControls } from './PlaybackContols';
import { VideoPlayer } from './VideoPlayer';

export const ListoApp = observer(function ListoApp() {
    let dvr: DigitalVideoRecorder;

    const [isLive, setIsLive] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null!);

    useEffect(function mount() {
        const initAsync = async () => {
            const options = {
                recording: {
                    source: new CameraStore().lastSelectedCameraId,
                },
            } as DvrOptions;

            console.log(videoRef.current);

            dvr = new DigitalVideoRecorder(videoRef.current, options);
            dvr.on('modechange', setIsLive);

            await dvr.showLiveStreamAndStartRecording();
        };

        initAsync().catch(console.error);

        return function dismount() {
            dvr.removeAllListeners();
        };
    }, []);

    const onCommand = (command: LiveStreamCommands | PlaybackCommands) => {
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
    };

    return (
        <>
            <CameraList onChangeCamera={() => location.reload()} />
            <VideoPlayer ref={videoRef} />
            {isLive ? (
                <LiveStreamControls onCommand={onCommand} />
            ) : (
                <PlaybackControls onCommand={onCommand} />
            )}
        </>
    );
});
