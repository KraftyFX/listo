import { assert } from 'chai';
import { SegmentRecorder } from '~/renderer/media/recording/segmentrecorder';
import { getLocator } from '~/renderer/services';

describe('SegmentRecorder', function () {
    afterEach(async () => {
        const { recorder } = getLocator();
        await recorder.stop();
    });

    it(`can start and stop before minimum recording size`, async () => {
        const { host } = getLocator();

        const recorder = new SegmentRecorder({
            inMemory: true,
            fixDuration: false,
        });

        assert.isFalse(recorder.isRecording, 'before start');

        const { now: startTime } = host;
        recorder.startRecording();

        assert.isTrue(recorder.isRecording, 'after start');

        await host.advanceTimeBy(500);

        assert.isTrue(recorder.startTime.isSame(startTime), 'startTime');
        assert.equal(recorder.duration, 0.5, 'duration in sec');

        assert.isTrue(recorder.isRecording, 'before stop');

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, 'after stop');
    });

    it(`can start and stop well after the minimum recording size`, async () => {
        const { host } = getLocator();

        const recorder = new SegmentRecorder({
            inMemory: true,
            fixDuration: false,
        });

        assert.isFalse(recorder.isRecording, 'before start');

        const { now: startTime } = host;
        recorder.startRecording();

        assert.isTrue(recorder.isRecording, 'after start');

        await host.advanceTimeBy(20000);

        assert.isTrue(recorder.startTime.isSame(startTime), 'startTime');
        assert.equal(recorder.duration, 20, 'duration in sec');

        assert.isTrue(recorder.isRecording, 'before stop');

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, 'after stop');
    });

    describe('Full segments', () => {
        it(`can record less than a minimum segment size video`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                minSegmentSizeInSec: 5,
                fixDuration: false,
            });

            let count = 0;

            recorder.onrecording = async (recording) => {
                assert.isFalse(recording.isPartial, 'partial');

                count++;
            };

            recorder.startRecording();

            await host.advanceTimeBy(500);

            await recorder.stopRecording();
            recorder.onrecording = null;

            assert.equal(count, 1, 'recordings');
        });

        it(`can record more than a minimum segment size of video`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                minSegmentSizeInSec: 5,
                fixDuration: false,
            });

            let count = 0;

            recorder.onrecording = async (recording) => {
                assert.isFalse(recording.isPartial, 'partial');

                count++;
            };

            recorder.startRecording();

            await host.advanceTimeBy(6000);

            await recorder.stopRecording();
            recorder.onrecording = null;

            assert.equal(count, 2, 'recordings');
        });

        it(`can record a few segments sizes worth of video`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                minSegmentSizeInSec: 5,
                fixDuration: false,
            });

            let count = 0;

            recorder.onrecording = async (recording) => {
                assert.isFalse(recording.isPartial, 'partial');

                count++;
            };

            recorder.startRecording();

            await host.advanceTimeBy(20000);

            await recorder.stopRecording();

            assert.equal(count, 5, 'recordings');
        });
    });

    describe('Partial segments', () => {
        it(`cannot force yield a recording before the minimum stream recording size`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                fixDuration: false,
            });

            recorder.onrecording = async (recording) => {
                assert.fail(`A recording was raised when it should not have`);
            };

            recorder.startRecording();

            await host.advanceTimeBy(500);

            const recording = await recorder.forceRender();

            assert.isNull(recording, 'recording');

            recorder.onrecording = null;
            recorder.stopRecording();
        });

        it(`can force yield a recording after the minimum stream recording size`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                fixDuration: false,
            });

            recorder.onrecording = async (recording) => {
                assert.isTrue(recording.isPartial, 'partial');
            };

            recorder.startRecording();

            await host.advanceTimeBy(1500);

            const recording = await recorder.forceRender();

            assert.isNotNull(recording, 'recording');

            recorder.onrecording = null;
            await recorder.stopRecording();
        });

        it(`can force yield a recording after a full segment`, async () => {
            const { host } = getLocator();

            const recorder = new SegmentRecorder({
                inMemory: true,
                fixDuration: false,
            });

            let count = 0;

            recorder.onrecording = async (recording) => {
                count++;

                if (count === 1) {
                    assert.isFalse(recording.isPartial, 'partial');
                } else if (count === 2) {
                    assert.isTrue(recording.isPartial, 'partial');
                } else {
                    assert.fail(`More recordings were yielded than expected. ${count}`);
                }
            };

            recorder.startRecording();

            await host.advanceTimeBy(7000);

            const recording = await recorder.forceRender();

            assert.isNotNull(recording, 'recording');

            recorder.onrecording = null;
            await recorder.stopRecording();
        });
    });
});
