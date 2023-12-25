import { IMediaRecorder, IVideoElement } from './interfaces';

export class ServiceLocator {
    videoElt: IVideoElement | null = null;
    recorder: IMediaRecorder | null = null;

    constructor() {}
}
