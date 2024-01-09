import { assert } from 'chai';
import { MockHostService } from 'test/services/host.mock';
import { MockVideoPlayer } from 'test/services/videoplayer.mock';
import { Playback } from '~/renderer/media/playback/playback';
import { getLocator } from '~/renderer/services';
import { getWithSparseSegments } from './segmentcollection.spec';

describe('Playback', () => {
    describe('Video Source', () => {
        it('can set the video source', async () => {
            const { player, playback, segments } = getPlayableInstance();

            assert.isFalse(playback.isVideoSource, 'Video source');

            await playback.setAsVideoSource(segments.firstSegmentStartTime);

            assert.isTrue(playback.isVideoSource, 'Video source');
            assert.equal(player.getVideoSource(), segments.segments[0].url, 'Player video source');
        });

        it('can release the video source', async () => {
            const { player, playback, segments } = getPlayableInstance();

            await playback.setAsVideoSource(segments.firstSegmentStartTime);

            assert.isTrue(playback.isVideoSource, 'Video source');

            await playback.releaseAsVideoSource();

            assert.isFalse(playback.isVideoSource, 'Video source');

            assert.equal(player.getVideoSource(), null, 'Player video source');
        });
    });

    describe('play()', () => {
        it('from start succeeds', async () => {
            const { playback, segments, host } = getPlayableInstance();

            await playback.setAsVideoSource(segments.firstSegmentStartTime);

            assert.isTrue(playback.isAtBeginning, 'isAtBeginning');

            await playback.play();
            await host.advanceTimeBy(250);

            const justPastStart = segments.firstSegmentStartTime.add(250, 'milliseconds');

            assert.equal(playback.currentTime.valueOf(), justPastStart.valueOf(), 'currentTime');
            assert.isFalse(playback.isAtBeginning, 'isAtBeginning');
        });

        it('from end of all playable segments does nothing', async () => {
            const { playback, segments, host } = getPlayableInstance();

            await playback.setAsVideoSource(segments.lastSegmentEndTime);

            assert.isTrue(playback.paused, 'paused');
            assert.isTrue(playback.isAtEnd, 'isAtEnd');

            await playback.play();
            await host.advanceTimeBy(250);

            const endOfAllVideos = segments.lastSegmentEndTime;

            assert.equal(playback.currentTime.valueOf(), endOfAllVideos.valueOf(), 'currentTime');
            assert.isTrue(playback.paused, 'paused');
            assert.isTrue(playback.isAtEnd, 'isAtEnd');
        });

        it('near the end of a segment plays into the next one', async () => {
            const { playback, segments, host } = getPlayableInstance();
            const { startTime, duration } = segments.segments[1];
            const beforeGapStart = startTime.add(duration - 0.5, 'seconds');

            await playback.setAsVideoSource(beforeGapStart);

            await playback.play();
            await host.advanceTimeBy(500);

            const afterGapStart = segments.segments[2].startTime;

            assert.equal(playback.currentTime.valueOf(), afterGapStart.valueOf(), 'currentTime');
        });

        it('from gap starts into the next adjacent', async () => {
            const { playback, segments } = getPlayableInstance();
            const inGapTime = segments.segments[2].startTime.subtract(0.5, 'seconds');

            await playback.setAsVideoSource(inGapTime);

            assert.equal(
                playback.currentTime.valueOf(),
                segments.segments[2].startTime.valueOf(),
                'currentTime'
            );
        });
    });
});

function getPlayableInstance() {
    const { host, player: _player } = getLocator();
    const player = _player as MockVideoPlayer;

    const { segments } = getWithSparseSegments();

    player.segments = segments;

    const playback = new Playback(segments);

    return { playback, segments, player, host: host as MockHostService };
}
