import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListoApp } from '~/renderer/Components/ListoApp';

dayjs.extend(duration);

export async function initListo(rootElt: HTMLElement) {
    const root = createRoot(rootElt);

    root.render(<ListoApp />);
}
