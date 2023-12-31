import { assert } from 'chai';
import { getLocator } from '~/renderer/services';

describe('StreamRecorder', () => {
    afterEach(() => {
        const { recorder } = getLocator();
        recorder.stop();
    });

    it('stopping after the timeslice duration yields blobs', async () => {
        const { host, recorder } = getLocator();

        let count = 0;

        recorder.ondataavailable = () => {
            count++;
        };

        await recorder.start(1000);

        await host.advanceTimeBy(1500);

        await recorder.stop();

        assert.equal(count, 2, 'count');
    });

    it('stopping before the timeslice duration yields blobs', async () => {
        const { host, recorder } = getLocator();

        let count = 0;

        recorder.ondataavailable = () => {
            count++;
        };

        await recorder.start(1000);

        await host.advanceTimeBy(100);

        await recorder.stop();

        assert.equal(count, 1, 'count');
    });

    it('stopping yields one trailing blob', async () => {
        const { recorder, host } = getLocator();

        let count = 0;

        recorder.ondataavailable = () => {
            count++;

            assert.isAtMost(count, 6, 'Recorder yielded more total segments than it should have');
        };

        recorder.start(1000);

        await host.advanceTimeBy(5000);

        assert.equal(count, 5, 'count');

        await recorder.stop();

        assert.equal(count, 6, 'count');
    });
});
