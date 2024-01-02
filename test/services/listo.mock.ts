import { Recording } from '~/renderer/media/recording';
import { IListoService } from '~/renderer/services';

export class MockListoService implements IListoService {
    async saveRecording({ startTime, duration }: Recording) {
        const startTimeFormat = startTime.format('YYYY-MM-DD-HH:mm:ss.SS');

        return `test://${startTimeFormat}-${duration.toFixed(2)}/`;
    }
}
