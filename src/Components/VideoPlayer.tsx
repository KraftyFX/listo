import React, { useEffect, useRef } from 'react';
import 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DvrProps {}

export function VideoPlayer(_props: DvrProps) {
    const videoRef = useRef<HTMLVideoElement>();

    useEffect(() => {
        console.log(videoRef);
    }, []);

    console.log('Rendering');

    return <video width="640" height="480" />;
}
