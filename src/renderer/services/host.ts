import dayjs from 'dayjs';
import { IHostService } from './interfaces';

export class HostService implements IHostService {
    setTimeout = setTimeout;
    clearTimeout = clearTimeout;

    setInterval = setInterval;
    clearInterval = clearInterval;

    async advanceTimeBy(ms: number) {
        throw new Error(`Not supported`);
    }

    get now() {
        return dayjs();
    }

    createObjectURL(blob: Blob) {
        return URL.createObjectURL(blob);
    }

    revokeObjectURL(url: string) {
        URL.revokeObjectURL(url);
    }
}
