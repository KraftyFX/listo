import { assert } from 'chai';
import { MockHostService } from 'test/services/host.mock';
import { MockStreamRecorder } from 'test/services/streamrecorder.mock';
import { getLocator } from '~/renderer/services';

describe('StreamRecorder', () => {
    it('can yield data in 1 second chunks for 5 seconds', async () => {
        const locator = getLocator();

        const host = (locator.host = new MockHostService());
        const recorder = (locator.recorder = new MockStreamRecorder());

        let count = 0;

        recorder.ondataavailable = () => {
            count++;
        };

        recorder.start(1000);
        host.advanceTimersBy(5000);

        assert.equal(count, 5, 'count');
    });
});
