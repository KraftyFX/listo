import { assert } from 'chai';
import { LiveStreamRecorder } from '~/renderer/media/recording/livestreamrecorder';
import { getLocator } from '~/renderer/services';

describe('LiveStreamRecorder', () => {
    afterEach(() => {
        const { player, reader } = getLocator();

        player.setVideoSource(null);
        reader.stop();
    });

    describe('Video Source', () => {
        it('can set the video source', async () => {
            const { player, reader } = getLocator();
            const liveStreamRecorder = new LiveStreamRecorder();

            assert.isFalse(liveStreamRecorder.isVideoSource, 'Video source');

            await liveStreamRecorder.setAsVideoSource();

            assert.isTrue(liveStreamRecorder.isVideoSource, 'Video source');
            assert.equal(player.getVideoSource(), reader.stream, 'Player video source');
        });

        it('can release the video source', async () => {
            const { player } = getLocator();
            const recorder = new LiveStreamRecorder();

            await recorder.setAsVideoSource();

            assert.isTrue(recorder.isVideoSource, 'Video source');

            await recorder.releaseAsVideoSource();

            assert.isFalse(recorder.isVideoSource, 'Video source');

            assert.equal(player.getVideoSource(), null, 'Player video source');
        });
    });

    describe('Recording', () => {
        it('can record a few seconds of full segment video', async () => {
            const { host } = getLocator();
            const recorder = new LiveStreamRecorder({
                fixDuration: false,
                minSizeInSec: 5,
            });

            const { segments } = recorder;

            segments.on('segmentadded', (segment) => {
                assert.isFalse(segment.isPartial, 'partial');
            });

            await recorder.startRecording();

            await host.advanceTimeBy(12000);

            await recorder.stopRecording();

            assert.equal(segments.length, 3, 'segment count');
        });
    });
});
