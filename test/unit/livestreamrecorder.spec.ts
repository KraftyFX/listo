import { assert } from 'chai';
import { LiveStreamRecorder } from '~/renderer/media/recording/livestreamrecorder';
import { getLocator } from '~/renderer/services';

describe('LiveStreamRecorder', () => {
    it('can set the video source', async () => {
        const {
            player,
            recorder: { stream },
        } = getLocator();
        const recorder = new LiveStreamRecorder();

        assert.isFalse(recorder.isVideoSource);

        await recorder.setAsVideoSource();

        assert.isTrue(recorder.isVideoSource);
        assert.equal(player.getVideoSource(), stream, 'Player video source');
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
});
