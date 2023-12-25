import { IStreamRecorder, IVideoPlayer } from './interfaces';

export class ServiceLocator {
    videoElt: IVideoPlayer | null = null;
    recorder: IStreamRecorder | null = null;

    constructor() {}
}
