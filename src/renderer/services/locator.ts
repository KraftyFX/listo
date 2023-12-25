import { IServiceLocator, IStreamRecorder, IVideoPlayer } from './interfaces';

export class ServiceLocator implements IServiceLocator {
    constructor(public readonly player: IVideoPlayer, public readonly recorder: IStreamRecorder) {}
}
