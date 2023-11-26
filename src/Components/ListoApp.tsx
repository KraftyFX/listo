import { observer } from 'mobx-react';
import React, { useEffect, useRef, useState } from 'react';
import { CameraStore } from '~/media/cameraStore';
import { DigitalVideoRecorder } from '~/media/digitalvideorecorder';
import { DvrOptions } from '~/media/dvrconfig';
import { CameraList } from './CameraList';
import { LiveStreamCommands, LiveStreamControls } from './LiveStreamControls';
import { PlaybackCommands, PlaybackControls } from './PlaybackContols';
import { Timeline } from './Timeline';
import { VideoPlayer } from './VideoPlayer';

let dvr: DigitalVideoRecorder;

export const ListoApp = observer(function ListoApp() {
    const videoRef = useRef<HTMLVideoElement>(null!);

    const [isLive, setIsLive] = useState(true);
    const [currentTime, setCurrentTime] = useState(-1);
    const [duration, setDuration] = useState(-1);
    const [multiplier, setMultiplier] = useState(0);

    useEffect(function mount() {
        const initAsync = async () => {
            const options = {
                recording: {
                    source: new CameraStore().lastSelectedCameraId,
                },
            } as DvrOptions;

            dvr = new DigitalVideoRecorder(videoRef.current, options);
            dvr.on('modechange', setIsLive);
            dvr.on('timeupdate', (currentTime, duration, multiplier) => {
                setCurrentTime((currentTime = Math.floor(currentTime)));
                setDuration((duration = Math.floor(duration)));
                setMultiplier(multiplier);
            });

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
            <Timeline
                onGoLive={() => dvr.switchToLiveStream()}
                onSnapToTime={() => dvr.goToPlaybackTime(0.5)}
                currentTime={currentTime}
                duration={duration}
                multiplier={multiplier}
            />
        </>
    );
});
