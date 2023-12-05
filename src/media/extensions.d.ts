import { DvrStore } from '~/Components/stores/dvrStore';
import { DigitalVideoRecorder } from './digitalvideorecorder';

declare global {
    interface Window {
        dvr: DigitalVideoRecorder;
        dvrStore: DvrStore;
    }
}
