import { assert } from 'chai';
import { MockStreamRecorder } from 'test/services/streamrecorder.mock';
import { SegmentRecorder } from '~/renderer/media/recording/segmentrecorder';
import { getLocator } from '~/renderer/services';

describe.only('SegmentRecorder', () => {
    it('can yield the right amount of data', async () => {
        const locator = getLocator();

        locator.recorder = new MockStreamRecorder({ arrayLength: 5 });

        let blob: Blob | null = null;
        const recorder = new SegmentRecorder({ fixDuration: false });

        recorder.onrecording = async ({ blob: b }) => {
            blob = b;
        };

        recorder.startRecording();
        await recorder.stopRecording();

        assert.isNotNull(blob, 'blob');
        assert.strictEqual(blob!.size, 5, 'blob size');
    });
});
