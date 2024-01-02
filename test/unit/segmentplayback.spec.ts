import { assert } from 'chai';
import { MockVideoPlayer } from 'test/services/videoplayer.mock';
import { SegmentPlayback } from '~/renderer/media/playback/segmentplayback';
import { getLocator } from '~/renderer/services';
import { getWithDenseSegments } from './segmentcollection.spec';

describe('SegmentPlayback', () => {
    describe('Video Source', () => {
        it('can set the video source', async () => {
            const player = getLocator().player as MockVideoPlayer;
            const segments = (player.segments = getWithDenseSegments());
            const playback = new SegmentPlayback(segments);

            assert.isFalse(playback.isVideoSource, 'Video source');

            await playback.setAsVideoSource(segments.firstSegmentStartTime);

            assert.isTrue(playback.isVideoSource, 'Video source');
            assert.equal(player.getVideoSource(), segments.segments[0].url, 'Player video source');
        });

        it('can release the video source', async () => {
            const player = getLocator().player as MockVideoPlayer;
            const segments = (player.segments = getWithDenseSegments());
            const playback = new SegmentPlayback(segments);

            await playback.setAsVideoSource(segments.firstSegmentStartTime);

            assert.isTrue(playback.isVideoSource, 'Video source');

            await playback.releaseAsVideoSource();

            assert.isFalse(playback.isVideoSource, 'Video source');

            assert.equal(player.getVideoSource(), null, 'Player video source');
        });
    });
});
