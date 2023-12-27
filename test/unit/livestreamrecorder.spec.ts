import { assert } from 'chai';
import { LiveStreamRecorder } from '~/renderer/media/recording/livestreamrecorder';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';
import { getLocator } from '~/renderer/services';

describe('LiveStreamRecorder', () => {
    afterEach(() => {
        const { player, recorder } = getLocator();

        player.setVideoSource(null);
        recorder.stop();
    });

    it('can set the video source', async () => {
        const { player, recorder } = getLocator();
        const liveStreamRecorder = new LiveStreamRecorder();

        assert.isFalse(liveStreamRecorder.isVideoSource);

        await liveStreamRecorder.setAsVideoSource();

        assert.isTrue(liveStreamRecorder.isVideoSource);
        assert.equal(player.getVideoSource(), recorder.stream, 'Player video source');
    });

    it('can release the video source', async () => {
        const { player } = getLocator();
        const recorder = new LiveStreamRecorder();

        assert.isFalse(recorder.isVideoSource);

        await recorder.setAsVideoSource();
        await recorder.releaseAsVideoSource();

        assert.isFalse(recorder.isVideoSource);
        assert.equal(player.getVideoSource(), null, 'Player video source');
    });

    it('can record a few seconds of video', async () => {
        const { host } = getLocator();
        const recorder = new LiveStreamRecorder(new SegmentCollection(), { fixDuration: false });

        let count = 0;

        recorder.segments.on('segmentadded', (segment) => {
            assert.isFalse(segment.isPartial, 'partial');

            count++;
        });

        await recorder.startRecording();

        await host.advanceTimeBy(10000);

        await recorder.stopRecording();

        assert.equal(count, 3, 'segment count');
    });
});
