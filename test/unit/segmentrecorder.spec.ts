import { assert } from 'chai';
import { SegmentRecorder } from '~/renderer/media/recording/segmentrecorder';
import { getLocator } from '~/renderer/services';

describe('SegmentRecorder', function () {
    afterEach(() => {
        const { recorder } = getLocator();
        recorder.stop();
    });

    it(`can start and stop quickly`, async () => {
        const { host } = getLocator();

        const recorder = new SegmentRecorder({
            inMemory: true,
            fixDuration: false,
        });

        assert.isFalse(recorder.isRecording, 'before start');

        recorder.startRecording();

        assert.isTrue(recorder.isRecording, 'after start');

        await host.advanceTimeBy(500);

        assert.isTrue(recorder.isRecording, 'before stop');

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, 'after stop');
    });

    it(`can start and stop after a while`, async () => {
        const { host } = getLocator();

        const recorder = new SegmentRecorder({
            inMemory: true,
            fixDuration: false,
        });

        assert.isFalse(recorder.isRecording, 'before start');

        recorder.startRecording();

        assert.isTrue(recorder.isRecording, 'after start');

        await host.advanceTimeBy(20000);

        assert.isTrue(recorder.isRecording, 'before stop');

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, 'after stop');
    });

    it(`can record less than a minimum segment size video`, async () => {
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

        recorder.startRecording();

        await host.advanceTimeBy(500);

        await recorder.stopRecording();

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

        recorder.onrecording = async () => {
            count++;
        };

        recorder.startRecording();

        await host.advanceTimeBy(6000);

        await recorder.stopRecording();

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

        recorder.onrecording = async () => {
            count++;
        };

        recorder.startRecording();

        await host.advanceTimeBy(20000);

        await recorder.stopRecording();

        assert.equal(count, 5, 'recordings');
    });
});
