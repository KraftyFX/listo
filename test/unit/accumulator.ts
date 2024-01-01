import { assert } from 'chai';
import { Recording } from '~/renderer/media/recording/mediastreamrecorder';

export class RecordingAccumulator {
    constructor(
        public readonly options: {
            expectedCount: number;
        }
    ) {}

    private recordings: Recording[] = [];

    onrecording = async (recording: Recording) => {
        assert.isNotNull(recording, 'recording');

        this.recordings.push(recording);

        this.assertIsBelowExpectedMax();
    };

    private assertIsBelowExpectedMax() {
        const actual = this.recordings.length;
        const expected = this.options.expectedCount;

        assert.isAtMost(actual, expected, 'The accumulator received more recordings than expected');
    }

    assertCount(count: number, message?: string) {
        assert.equal(this.recordings.length, count, message);
    }

    assertAllRecordingsAreFull() {
        assert.isAbove(this.recordings.length, 0, 'count of recordings');

        this.recordings.forEach((r, idx) => {
            assert.isFalse(
                r.isPartial,
                `Recording ${idx}/${this.recordings.length} should have been full but was not`
            );
        });
    }

    assertOnlyLastRecordingIsPartial() {
        assert.isAbove(this.recordings.length, 0, 'count of recordings');

        const leading = this.recordings.slice(0, -1);
        const last = this.recordings.slice(-1)[0];

        leading.forEach((v, idx) =>
            assert.isFalse(
                v.isPartial,
                `Recording ${idx}/${this.recordings.length} is partial but should not be`
            )
        );
        assert.isTrue(last.isPartial, `Final recording should have been partial but was not`);
    }
}
