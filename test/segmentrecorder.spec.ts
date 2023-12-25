import { assert } from 'chai';
import { SegmentRecorder } from '~/renderer/media/recording/segmentrecorder';

describe('SegmentRecorder', function () {
    this.slow(10000);
    this.timeout(10000);

    let stream: MediaStream = null!;

    before(async () => {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: 'default',
            },
        });
    });

    after(async () => {});

    it(`Does not record video after being stopped`, async () => {
        const recorder = new SegmentRecorder(stream, { inMemory: true, minSegmentSizeInSec: 2 });

        recorder.onrecording = async () => {
            assert.fail(`Recording happened when it should not have`);
        };

        recorder.startRecording();
        assert.isTrue(recorder.isRecording, `isRecording`);

        await waitFor(1000);
        await recorder.stopRecording();

        await waitFor(1000);

        assert.isFalse(recorder.isRecording, `isRecording`);
    });
});

function waitFor(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
