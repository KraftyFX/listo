import './index.css';
import { initListo } from './main';

window.onload = async () => {
    await initListo(document.getElementById('page')!);
};
