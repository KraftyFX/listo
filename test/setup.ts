import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { ServiceLocator, setLocator } from '~/renderer/services';
import { MockHostService } from './services/host.mock';
import { MockListoService } from './services/listo.mock';
import { MockMediaStreamReader } from './services/mediastreamreader.mock';
import { MockVideoPlayer } from './services/videoplayer.mock';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

before(() => {
    setLocator(
        new ServiceLocator(
            new MockVideoPlayer(),
            new MockMediaStreamReader(),
            new MockListoService(),
            new MockHostService()
        )
    );
});
