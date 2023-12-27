import { IHostService } from './interfaces';

export class HostService implements IHostService {
    setTimeout = setTimeout;
    clearTimeout = clearTimeout;

    setInterval = setInterval;
    clearInterval = clearInterval;

    async advanceTimeBy(ms: number) {
        throw new Error(`Not supported`);
    }

    createObjectURL(blob: Blob) {
        return URL.createObjectURL(blob);
    }

    revokeObjectURL(url: string) {
        URL.revokeObjectURL(url);
    }
}
