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

    it('Can record 2 seconds of video', async () => {
        const recorder = new SegmentRecorder(stream, { inMemory: true, minSegmentSizeInSec: 1 });

        let count = 0;

        recorder.onrecording = async () => {
            count++;

            if (count > 2) {
                assert.fail(`Recording happened when it should not have`);
            }
        };

        try {
            recorder.startRecording();

            await waitFor(4000);

            assert.equal(count, 2, `count`);
        } finally {
            await recorder.stopRecording();
        }
    });

    it(`Cannot record video after being stopped`, async () => {
        const recorder = new SegmentRecorder(stream, { inMemory: true, minSegmentSizeInSec: 2 });

        let count = 0;

        recorder.onrecording = async () => {
            assert.fail(`Recording happened when it should not have`);
        };

        recorder.startRecording();
        await recorder.stopRecording();

        await waitFor(1000);

        assert.equal(count, 0, `count`);
    });
});

function waitFor(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
