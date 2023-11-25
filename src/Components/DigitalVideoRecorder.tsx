import React, { useRef } from 'react';
import 'react-dom';
import { PlayerMode } from './interfaces';

export interface DvrProps {
    mode: PlayerMode;
}

export function DigitalVideoRecorder(_props: DvrProps) {
    const videoRef = useRef();

    return <video ref={videoRef} width="640" height="480" />;
}
