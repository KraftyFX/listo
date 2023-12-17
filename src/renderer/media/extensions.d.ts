import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { DigitalVideoRecorder } from './dvr';

declare global {
    interface Window {
        dvr: DigitalVideoRecorder;
        dvrStore: DvrStore;
    }
}
