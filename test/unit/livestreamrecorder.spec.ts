import { assert } from 'chai';
import { LiveStreamRecorder } from '~/renderer/media/recording/livestreamrecorder';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';

describe('LiveStreamRecorder', () => {
    it('can be set as the video source', async () => {
        const segments = new SegmentCollection();
        const recorder = new LiveStreamRecorder(segments);

        await recorder.setAsVideoSource();

        assert.isTrue(recorder.isVideoSource);
    });
});
