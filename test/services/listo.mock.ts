import { Recording } from '~/renderer/media/recording';
import { IListoService } from '~/renderer/services';

export class MockListoService implements IListoService {
    async getRecentRecordings(startTimeIso: string, endTimeIso: string): Promise<Recording[]> {
        return [];
    }

    async saveRecording({ startTime, duration }: Recording, blob: Blob, hasErrors: boolean) {
        const startTimeFormat = startTime.format('YYYY-MM-DD-HH:mm:ss.SS');

        return `test://${startTimeFormat}-${duration.toFixed(2)}/`;
    }
}
