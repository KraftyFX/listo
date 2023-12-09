import { DvrStore } from '~/Components/stores/dvrStore';
import { DigitalVideoRecorder } from './dvr';

declare global {
    interface Window {
        dvr: DigitalVideoRecorder;
        dvrStore: DvrStore;
    }
}
