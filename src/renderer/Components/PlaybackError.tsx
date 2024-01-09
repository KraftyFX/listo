import { observer } from 'mobx-react';
import React from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { isMediaDecodingError } from '~/renderer/services/errorutil';

export interface PlaybackErrorProps {
    dvrStore: DvrStore;
}

export const PlaybackError = observer(function PlaybackError(props: PlaybackErrorProps) {
    const { dvrStore } = props;

    if (!dvrStore.error) {
        return null;
    }

    const { error, segment, handled } = dvrStore.error;

    if (isMediaDecodingError(error) && handled) {
        return (
            <div className="error handled">
                The video seems a little corrupt here. I'm skipping passed that bit.
            </div>
        );
    } else {
        return (
            <div className={handled ? `error handled` : `error`}>
                Segment {segment.index}. {error.message}
            </div>
        );
    }
});
