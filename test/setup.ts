import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { ServiceLocator, setLocator } from '~/renderer/services';
import { MockHostService } from './services/host.mock';
import { MockStreamRecorder } from './services/streamrecorder.mock';
import { MockVideoPlayer } from './services/videoplayer.mock';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

before(() => {
    setLocator(
        new ServiceLocator(new MockVideoPlayer(), new MockStreamRecorder(), new MockHostService())
    );
});
