import { observer } from 'mobx-react';
import React, { useEffect } from 'react';
import 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DvrProps {}

export const VideoPlayer = observer(
    React.forwardRef<null, DvrProps>(function VideoPlayer(_props: DvrProps, ref) {
        useEffect(() => {}, []);

        return <video ref={ref} width="640" height="480" />;
    })
);
