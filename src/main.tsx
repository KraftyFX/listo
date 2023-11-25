import React from 'react';
import { createRoot } from 'react-dom/client';

export function initApplication() {
    const page = document.getElementById('page');

    const root = createRoot(page);
    root.render(<div>Hello React</div>);
}
