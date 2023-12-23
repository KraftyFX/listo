import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListoApp } from '~/renderer/Components/ListoApp';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export async function initListo(rootElt: HTMLElement) {
    const root = createRoot(rootElt);

    root.render(<ListoApp />);
}
