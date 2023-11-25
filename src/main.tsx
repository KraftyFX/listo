import React from 'react';
import { createRoot } from 'react-dom/client';
import { ListoApp } from './Components/ListoApp';

export function initListo(rootElt: HTMLElement) {
    const root = createRoot(rootElt);
    root.render(<ListoApp />);
}
