import { observer } from 'mobx-react';
import React from 'react';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';

export interface PlaybackErrorProps {
    dvrStore: DvrStore;
}

export const PlaybackError = observer(function PlaybackError(props: PlaybackErrorProps) {
    const { dvrStore } = props;

    if (!dvrStore.error) {
        return null;
    }

    const { error, segment, handled } = dvrStore.error;

    return (
        <div className={handled ? `error handled` : `error`}>
            Segment {segment.index}. {error.message}
        </div>
    );
});
