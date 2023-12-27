import { assert } from 'chai';
import { SegmentRecorder } from '~/renderer/media/recording/segmentrecorder';
import { getLocator } from '~/renderer/services';

describe('SegmentRecorder', function () {
    after(() => {
        const { recorder } = getLocator();
        recorder.stop();
    });

    it(`can record a 5 + 1 second segment of video`, async () => {
        const { host } = getLocator();

        const recorder = new SegmentRecorder({
            inMemory: true,
            minSegmentSizeInSec: 5,
            fixDuration: false,
        });

        let count = 0;

        recorder.onrecording = async () => {
            count++;
        };

        assert.isFalse(recorder.isRecording, `isRecording before start`);

        recorder.startRecording();

        assert.isTrue(recorder.isRecording, `isRecording after start`);

        await host.advanceTimeBy(6000);

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, `isRecording after stop`);

        assert.equal(count, 2, 'recordings');
    });
});
