import dayjs from 'dayjs';
import { Recording } from '../media/recording';
import { IListoService } from './interfaces';

export class ListoService implements IListoService {
    async getRecentRecordings(startTimeIso: string, endTimeIso: string): Promise<Recording[]> {
        const recordings = await window.listoApi.getRecentRecordings(startTimeIso, endTimeIso);

        return recordings.map(
            ({ startTimeIso, duration, url }) =>
                ({
                    startTime: dayjs(startTimeIso),
                    duration,
                    url,
                    isPartial: false,
                } as Recording)
        );
    }

    async saveRecording(recording: Recording, blob: Blob, hasErrors: boolean): Promise<string> {
        const { startTime, duration } = recording;

        return await window.listoApi.saveRecording(
            startTime.toISOString(),
            duration,
            [blob],
            hasErrors
        );
    }
}
