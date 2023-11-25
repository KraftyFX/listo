import React from 'react';
import * as ReactDom from 'react-dom';

export function initApplication() {
    const page = document.getElementById('page');

    ReactDom.render(<div>Hello React</div>, page);
}
