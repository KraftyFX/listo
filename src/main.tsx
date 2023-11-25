import React from 'react';
import { createRoot } from 'react-dom/client';
import { VideoPlayer } from './Components/VideoPlayer';

export function initListo(rootElt: HTMLElement) {
    const root = createRoot(rootElt);
    root.render(<VideoPlayer></VideoPlayer>);
}
