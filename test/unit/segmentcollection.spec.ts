import { assert } from 'chai';
import dayjs from 'dayjs';
import { Segment } from '~/renderer/media/segments/interfaces';
import { SegmentCollection } from '~/renderer/media/segments/segmentcollection';

describe.only('SegmentCollection', () => {
    it('can add a segment', async () => {
        const segments = new SegmentCollection();

        let raised: Segment = null!;

        segments.on('segmentadded', (segment) => {
            raised = segment;
        });

        const returned = segments.addSegment(dayjs(), 'test://', 5, false);

        assert.isNotNull(raised, 'raised');
        assert.isNotNull(returned, 'returned');

        assert.equal(raised, returned, 'raised and returned');

        assert.equal(segments.length, 1, 'count');
    });

    it('can add a few segments', async () => {
        const segments = new SegmentCollection();
        const start = dayjs();

        let raised: Segment = null!;

        segments.on('segmentadded', (segment) => {
            raised = segment;
        });

        let last: Segment = null!;

        for (let i = 0; i < 3; i++) {
            last = segments.addSegment(start.add(5 * i, 'seconds'), 'test://', 5, false);

            assert.isNotNull(raised, 'raised');
            assert.isNotNull(last, 'returned');

            assert.equal(raised, last, 'raised and returned');

            assert.equal(segments.length, i + 1, 'count');
            assert.equal(segments.lastSegment, last, `last segment at ${i}`);
        }
    });

    it('can replace a partial segment with a new partial segment', async () => {
        const segments = new SegmentCollection();

        const partial = segments.addSegment(dayjs(), 'test://', 3, true);

        // Fake dispose
        partial.url = '';

        const replacement = segments.addSegment(dayjs().add(3, 'seconds'), 'test://', 4, true);

        assert.equal(segments.lastSegment, replacement, 'last segment');
        assert.equal(segments.length, 1, 'count');
    });

    it('can replace a partial segment with a new full segment', async () => {
        const segments = new SegmentCollection();

        const partial = segments.addSegment(dayjs(), 'test://', 3, true);

        // Fake dispose
        partial.url = '';

        const replacement = segments.addSegment(dayjs().add(3, 'seconds'), 'test://', 4, false);

        assert.equal(segments.lastSegment, replacement, 'last segment');
        assert.equal(segments.length, 1, 'count');
    });
});
