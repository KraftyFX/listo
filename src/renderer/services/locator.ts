import { IServiceLocator, IStreamRecorder, IVideoPlayer } from './interfaces';

export class ServiceLocator implements IServiceLocator {
    constructor(public player: IVideoPlayer, public recorder: IStreamRecorder) {}
}

let _locator: ServiceLocator | null = null;

export function setLocator(locator: ServiceLocator) {
    _locator = locator;

    return getLocator();
}

export function getLocator() {
    if (!_locator) {
        throw new Error(`Locator has not been initalized.`);
    }

    return _locator;
}
