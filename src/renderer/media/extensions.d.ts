import { LISTO_API } from '~/preload/listoApi';
import { DvrStore } from '~/renderer/Components/stores/dvrStore';
import { DigitalVideoRecorder } from './dvr';

declare global {
    interface Window {
        dvr: DigitalVideoRecorder;
        dvrStore: DvrStore;
        listoApi: typeof LISTO_API;
    }
}
