import dayjs, { Dayjs } from 'dayjs';
import { Recording } from '~/renderer/media/recording';
import { IListoService, RecordingEx } from './interfaces';

export class ListoService implements IListoService {
    async getRecentRecordings(startTime: Dayjs, endTime: Dayjs): Promise<RecordingEx[]> {
        const recordings = await window.listoApi.getRecentRecordings(
            startTime.toISOString(),
            endTime.toISOString()
        );

        return recordings.map(
            ({ startTimeIso, duration, url, hasErrors }) =>
                ({
                    startTime: dayjs(startTimeIso),
                    duration,
                    url,
                    hasErrors,
                    isPartial: false,
                } as RecordingEx)
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
