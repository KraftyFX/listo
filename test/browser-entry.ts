import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'mocha/browser-entry';
import '../node_modules/mocha/mocha.css';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

mocha.setup({ ui: 'bdd' });

window.onload = () => {
    mocha.run();
};

import './segmentrecorder.spec';
