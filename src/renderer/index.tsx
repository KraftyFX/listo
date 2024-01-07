import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListoApp } from '~/renderer/Components/ListoApp';
import { DvrStore } from './Components/stores/dvrStore';
import './index.css';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

window.onload = async () => {
    const elt = document.getElementById('page')!;
    const root = createRoot(elt);

    const dvrStore = new DvrStore();

    root.render(<ListoApp dvrStore={dvrStore} />);
};
