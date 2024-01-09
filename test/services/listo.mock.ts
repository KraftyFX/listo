import { Dayjs } from 'dayjs';
import { Recording } from '~/renderer/media/recording';
import { IListoService, RecordingEx } from '~/renderer/services';

export class MockListoService implements IListoService {
    async getRecentRecordings(startTimeIso: Dayjs, endTimeIso: Dayjs): Promise<RecordingEx[]> {
        return [];
    }

    async saveRecording({ startTime, duration }: Recording, blob: Blob, hasErrors: boolean) {
        const startTimeFormat = startTime.format('YYYY-MM-DD-HH:mm:ss.SS');

        return `test://${startTimeFormat}-${duration.toFixed(2)}/`;
    }
}
