import { assert } from 'chai';
import { getLocator } from '~/renderer/services';

describe('StreamRecorder', () => {
    it('stopping after the timeslice duration yields blobs', async () => {
        const { host, reader } = getLocator();

        let count = 0;

        reader.ondataavailable = () => {
            count++;
        };

        await reader.start(1000);

        await host.advanceTimeBy(1500);

        await reader.stop();

        assert.equal(count, 2, 'count');
    });

    it('stopping before the timeslice duration yields blobs', async () => {
        const { host, reader } = getLocator();

        let count = 0;

        reader.ondataavailable = () => {
            count++;
        };

        await reader.start(1000);

        await host.advanceTimeBy(100);

        await reader.stop();

        assert.equal(count, 1, 'count');
    });

    it('stopping yields one trailing blob', async () => {
        const { reader, host } = getLocator();

        let count = 0;

        reader.ondataavailable = () => {
            count++;

            assert.isAtMost(count, 6, 'Recorder yielded more total segments than it should have');
        };

        reader.start(1000);

        await host.advanceTimeBy(5000);

        assert.equal(count, 5, 'count');

        await reader.stop();

        assert.equal(count, 6, 'count');
    });
});
