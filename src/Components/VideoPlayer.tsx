import { observer } from 'mobx-react';
import React, { ForwardedRef, useEffect } from 'react';
import 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DvrProps {}

export const VideoPlayer = observer(
    React.forwardRef(function VideoPlayer(_props: DvrProps, ref: ForwardedRef<HTMLVideoElement>) {
        useEffect(() => {}, []);

        return <video ref={ref} width="640" height="480" />;
    })
);
