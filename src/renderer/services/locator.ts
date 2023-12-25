import { IMediaRecorder, IVideoPlayer } from './interfaces';

export class ServiceLocator {
    videoElt: IVideoPlayer | null = null;
    recorder: IMediaRecorder | null = null;

    constructor() {}
}
