import { assert } from 'chai';
import { MediaStreamRecorder } from '~/renderer/media/recording/mediastreamrecorder';
import { getLocator } from '~/renderer/services';
import { RecordingAccumulator } from './accumulators';

describe('SegmentRecorder', function () {
    afterEach(async () => {
        const { reader } = getLocator();
        await reader.stop();
    });

    it(`can start and stop before minimum recording size`, async () => {
        const { host } = getLocator();

        const recorder = new MediaStreamRecorder({
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

        const recorder = new MediaStreamRecorder({
            inMemory: true,
            minSizeInSec: 5,
            fixDuration: false,
        });

        assert.isFalse(recorder.isRecording, 'before start');

        const { now: startTime } = host;
        recorder.startRecording();

        assert.isTrue(recorder.isRecording, 'after start');

        await host.advanceTimeBy(21000);

        assert.equal(recorder.startTime.valueOf(), startTime.add(20000).valueOf(), 'startTime');
        assert.equal(recorder.duration, 1, 'duration in sec');

        assert.isTrue(recorder.isRecording, 'before stop');

        await recorder.stopRecording();

        assert.isFalse(recorder.isRecording, 'after stop');
    });

    describe('Full segments', () => {
        it(`can record less than a minimum stream slice of video`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                minSizeInSec: 5,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 1,
            });

            recorder.onrecording = accumulator.onrecording;

            recorder.startRecording();

            await host.advanceTimeBy(500);

            await recorder.stopRecording();

            accumulator.assertCount();
        });

        it(`can record less than a minimum recording size of video`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                minSizeInSec: 5,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 1,
            });

            recorder.onrecording = accumulator.onrecording;

            recorder.startRecording();

            await host.advanceTimeBy(4900);

            await recorder.stopRecording();

            accumulator.assertCount();
        });

        it(`can record more than a minimum recording size of video`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                minSizeInSec: 5,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 2,
            });

            recorder.onrecording = accumulator.onrecording;

            recorder.startRecording();

            await host.advanceTimeBy(6000);

            await recorder.stopRecording();

            accumulator.assertCount();
            accumulator.assertAllRecordingsAreFull();
        });

        it(`can record a few segments sizes worth of video`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                minSizeInSec: 5,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 5,
            });

            recorder.onrecording = accumulator.onrecording;

            recorder.startRecording();

            await host.advanceTimeBy(20000);

            await recorder.stopRecording();

            accumulator.assertCount();
            accumulator.assertAllRecordingsAreFull();
        });
    });

    describe('Partial segments', () => {
        it(`cannot force yield a recording before the minimum STREAM recording size`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 1,
            });

            recorder.onrecording = accumulator.onrecording;
            recorder.startRecording();

            await host.advanceTimeBy(500);

            const recording = await recorder.forceRender();

            assert.isNull(recording, 'recording');

            accumulator.assertCount(0);

            await recorder.stopRecording();
        });

        it(`can force yield a recording before the minimum recording recording size`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 2,
            });

            recorder.onrecording = accumulator.onrecording;
            recorder.startRecording();

            await host.advanceTimeBy(1500);

            const recording = await recorder.forceRender();

            assert.isNotNull(recording, 'recording');

            accumulator.assertCount(1);
            accumulator.assertOnlyLastRecordingIsPartial();

            await recorder.stopRecording();
        });

        it(`can force yield a recording after a full segment`, async () => {
            const { host } = getLocator();

            const recorder = new MediaStreamRecorder({
                inMemory: true,
                fixDuration: false,
            });

            const accumulator = new RecordingAccumulator({
                expectedCount: 3,
            });

            recorder.onrecording = accumulator.onrecording;
            recorder.startRecording();

            await host.advanceTimeBy(7000);

            const recording = await recorder.forceRender();

            assert.isNotNull(recording, 'recording');

            accumulator.assertCount(2);
            accumulator.assertOnlyLastRecordingIsPartial();

            await recorder.stopRecording();
        });
    });
});
