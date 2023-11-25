import React from 'react';
import { createRoot } from 'react-dom/client';
import { VideoPlayer } from './media/VideoPlayer';

export function initListo() {
    const page = document.getElementById('page');

    const root = createRoot(page);
    root.render(<VideoPlayer></VideoPlayer>);
}
