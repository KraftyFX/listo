import { IHostService } from './interfaces';

export class HostService implements IHostService {
    setTimeout = setTimeout;
    clearTimeout = clearTimeout;

    setInterval = setInterval;
    clearInterval = clearInterval;

    async advanceTimeBy(ms: number) {
        throw new Error(`Not supported`);
    }
}
