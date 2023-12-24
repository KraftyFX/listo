import 'mocha/browser-entry';
import '../node_modules/mocha/mocha.css';

mocha.setup({ ui: 'bdd' });

window.onload = () => {
    mocha.run();
};

import './foo.spec';
