import { assert } from 'chai';
import { getLocator } from '~/renderer/services';

describe('StreamRecorder', () => {
    after(() => {
        const { recorder } = getLocator();
        recorder.stop();
    });

    it('stopping after the timeslice time produces data', async () => {
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

    it('stopping before the timeslice time produces data', async () => {
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

    it('can yield data in 1 second chunks for 5 seconds', async () => {
        const { recorder, host } = getLocator();

        let count = 0;

        recorder.ondataavailable = () => {
            count++;
        };

        recorder.start(1000);

        await host.advanceTimeBy(5000);

        assert.equal(count, 5, 'count');

        await recorder.stop();

        assert.equal(count, 6, 'count');
    });
});
