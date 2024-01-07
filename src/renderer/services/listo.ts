import { Recording } from '../media/recording';
import { IListoService } from './interfaces';

export class ListoService implements IListoService {
    async saveRecording(recording: Recording, hasErrors: boolean): Promise<string> {
        const { startTime, duration, blob } = recording;

        return await window.listoApi.saveRecording(
            startTime.toISOString(),
            duration,
            [blob],
            hasErrors
        );
    }
}
