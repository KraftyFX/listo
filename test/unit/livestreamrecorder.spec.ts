import { assert } from 'chai';
import { LiveStreamRecorder } from '~/renderer/media/recording/livestreamrecorder';
import { getLocator } from '~/renderer/services';

describe('LiveStreamRecorder', () => {
    afterEach(() => {
        const { player, reader } = getLocator();

        player.setVideoSource(null);
        reader.stop();
    });

    describe('Video Source', () => {
        it('can set the video source', async () => {
            const { player, reader } = getLocator();
            const liveStreamRecorder = new LiveStreamRecorder();

            assert.isFalse(liveStreamRecorder.isVideoSource, 'Video source');

            await liveStreamRecorder.setAsVideoSource();

            assert.isTrue(liveStreamRecorder.isVideoSource, 'Video source');
            assert.equal(player.getVideoSource(), reader.stream, 'Player video source');
        });

        it('can release the video source', async () => {
            const { player } = getLocator();
            const recorder = new LiveStreamRecorder();

            await recorder.setAsVideoSource();

            assert.isTrue(recorder.isVideoSource, 'Video source');

            await recorder.releaseAsVideoSource();

            assert.isFalse(recorder.isVideoSource, 'Video source');

            assert.equal(player.getVideoSource(), null, 'Player video source');
        });
    });

    describe('Filling a segment collection', () => {
        it('can fill with less than the minimum recording size', async () => {
            const { host } = getLocator();
            const recorder = new LiveStreamRecorder({
                fixDuration: false,
                minSizeInSec: 5,
            });

            const { segments } = recorder;
            const startTime = host.now;

            segments.on('segmentadded', (segment) => {
                assert.isFalse(segment.isPartial, 'partial');

                assert.equal(segment.duration, 4.5, 'duration');
                assert.equal(segment.startTime.valueOf(), startTime.valueOf(), 'startTime');
            });

            await recorder.startRecording();

            await host.advanceTimeBy(4500);

            await recorder.stopRecording();

            segments.removeAllListeners();
            assert.equal(segments.length, 1, 'segment count');
        });

        it('can fill with less than the minimum recording size (partial)', async () => {
            const { host } = getLocator();
            const recorder = new LiveStreamRecorder({
                fixDuration: false,
                minSizeInSec: 5,
            });

            const { segments } = recorder;

            const startTime = host.now;

            segments.on('segmentadded', (segment) => {
                assert.isTrue(segment.isPartial, 'partial');

                assert.equal(segment.duration, 4.5, 'duration');
                assert.equal(segment.startTime.valueOf(), startTime.valueOf(), 'startTime');
            });

            await recorder.startRecording();

            await host.advanceTimeBy(4500);

            await recorder.forceFillWithLatestVideoData();

            assert.equal(segments.length, 1, 'segment count');

            segments.removeAllListeners();
            await recorder.stopRecording();
        });

        it.only('can fill with few full segments of recordings', async () => {
            const { host } = getLocator();
            const recorder = new LiveStreamRecorder({
                fixDuration: false,
                minSizeInSec: 5,
            });

            const { segments } = recorder;
            const startTime = host.now;

            segments.on('segmentadded', (segment) => {
                assert.isFalse(segment.isPartial, 'partial');

                assert.equal(segment.duration, 5, 'duration');

                const expectedStartTime = startTime.add(segment.index * 5, 'seconds');

                assert.equal(segment.startTime.valueOf(), expectedStartTime.valueOf(), 'startTime');
            });

            await recorder.startRecording();

            await host.advanceTimeBy(12000);

            segments.removeAllListeners();
            await recorder.stopRecording();

            assert.equal(segments.length, 3, 'segment count');
        });

        it('can force fill with a partial segment', async () => {
            const { host } = getLocator();
            const recorder = new LiveStreamRecorder({
                fixDuration: false,
                minSizeInSec: 5,
            });

            const { segments } = recorder;

            await recorder.startRecording();

            await host.advanceTimeBy(12000);

            segments.on('segmentadded', (segment) => {
                assert.isTrue(segment.isPartial, 'partial');
            });

            await recorder.forceFillWithLatestVideoData();

            assert.equal(segments.length, 3, 'segment count');

            segments.removeAllListeners();
            await recorder.stopRecording();
        });
    });
});
