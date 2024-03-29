import { assert } from 'chai';
import { Segment, SegmentCollection } from '~/renderer/media/segments';
import { getLocator } from '~/renderer/services';

describe('SegmentCollection', () => {
    describe('addSegment()', () => {
        it('once', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            let raised: Segment = null!;

            segments.on('added', (segment) => {
                raised = segment;
            });

            const returned = segments.addSegment(
                { startTime: host.now, duration: 5, isPartial: false },
                'test://'
            );

            assert.isNotNull(raised, 'raised');
            assert.isNotNull(returned, 'returned');

            assert.equal(raised, returned, 'raised and returned');

            assert.equal(segments.length, 1, 'count');
        });

        it('many times', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            let raised: Segment = null!;

            segments.on('added', (segment) => {
                raised = segment;
            });

            let last: Segment = null!;

            for (let i = 0; i < 3; i++) {
                last = segments.addSegment(
                    { startTime: host.now, duration: 5, isPartial: false },
                    'test://'
                );

                assert.isNotNull(raised, 'raised');
                assert.isNotNull(last, 'returned');

                assert.equal(raised, last, 'raised and returned');

                assert.equal(segments.length, i + 1, 'count');
                assert.equal(segments.lastSegment, last, `last segment at ${i}`);

                host.advanceTimeBy(5000);
            }
        });

        it('many times with last as partial', async () => {
            const { host } = getLocator();
            const segments = getWithDenseSegments();

            segments.addSegment({ startTime: host.now, duration: 5, isPartial: true }, 'test://');

            assert.isTrue(segments.isLastSegmentPartial, 'partial');
        });

        it('replaces last partial with new partial', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            const partial = segments.addSegment(
                { startTime: host.now, duration: 3, isPartial: true },
                'test://'
            );
            host.advanceTimeBy(3000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            // Fake dispose
            partial.url = '';

            const replacement = segments.addSegment(
                { startTime: host.now, duration: 4, isPartial: true },
                'test://'
            );
            host.advanceTimeBy(4000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            assert.equal(segments.lastSegment, replacement, 'last segment');
            assert.equal(segments.length, 1, 'count');
        });

        it('replaces last partial with new full partial', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();

            const partial = segments.addSegment(
                { startTime: host.now, duration: 3, isPartial: true },
                'test://'
            );
            host.advanceTimeBy(3000);

            assert.isTrue(segments.isLastSegmentPartial, 'isLastSegmentPartial');

            // Fake dispose
            partial.url = '';

            const replacement = segments.addSegment(
                { startTime: host.now, duration: 4, isPartial: false },
                'test://'
            );
            host.advanceTimeBy(4000);

            assert.isFalse(segments.isLastSegmentPartial, 'isLastSegmentPartial');
            assert.equal(segments.lastSegment, replacement, 'last segment');
            assert.equal(segments.length, 1, 'count');
        });
    });

    describe('Properties', () => {
        it('firstSegmentStartTime is correct', async () => {
            const segments = getWithDenseSegments();

            assert.equal(
                segments.firstSegmentStartTime,
                segments.segments[0].startTime,
                'start times'
            );
        });

        it('lastSegment is correct', async () => {
            const segments = getWithDenseSegments();
            const actual = segments.segments[segments.length - 1];
            const expected = segments.lastSegment;

            assert.equal(actual, expected, 'segment');
        });

        it('lastSegmentEndTime is correct', async () => {
            const segments = getWithDenseSegments();
            const { startTime, duration } = segments.segments[segments.length - 1];

            const actual = startTime.add(duration, 'seconds');
            const expected = segments.lastSegmentEndTime;

            assert.equal(actual.valueOf(), expected.valueOf(), 'segment');
        });
    });

    describe('Segment instance tests', () => {
        it('isFirstSegment(first) succeeds', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[0];

            assert.isTrue(segments.isFirstSegment(segment), 'first segment');
        });

        it('isFirstSegment(other) fails', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[1];

            assert.isFalse(segments.isFirstSegment(segment), 'first segment');
        });

        it('isLastSegment(last) succeeds', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.lastSegment;

            assert.isTrue(segments.isLastSegment(segment), 'first segment');
        });

        it('isLastSegment(other) fails', async () => {
            const segments = getWithDenseSegments();
            const segment = segments.segments[1];

            assert.isFalse(segments.isLastSegment(segment), 'first segment');
        });

        it('getNextSegment(first) is correct', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.segments[0];
            const next = segments.segments[1];

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(mid) is correct', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.segments[2];
            const next = segments.segments[3];

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(last) is null', async () => {
            const segments = getWithDenseSegments();
            const curr = segments.lastSegment;
            const next = null;

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });

        it('getNextSegment(null) is null', async () => {
            const { host } = getLocator();
            const segments = new SegmentCollection();
            const curr = segments.addSegment(
                { startTime: host.now, duration: 0, isPartial: false },
                'test://'
            );
            const next = null;

            assert.equal(segments.getNextSegment(curr), next, 'segment');
        });
    });

    describe('containsTime()', () => {
        it('before firstSegmentStartTime fails', async () => {
            const segments = getWithDenseSegments();
            const time = segments.firstSegmentStartTime.subtract(1, 'second');

            assert.isFalse(segments.containsTime(time), 'time');
        });

        it('within first/last segment start/end time succeeds', async () => {
            const segments = getWithDenseSegments();
            const duration = segments.lastSegmentEndTime.diff(segments.firstSegmentStartTime);
            const time = segments.firstSegmentStartTime.add(duration / 2, 'milliseconds');

            assert.isTrue(segments.containsTime(time), 'time');
        });

        it('after lastSegmentEndTime fails', async () => {
            const segments = getWithDenseSegments();
            const time = segments.lastSegmentEndTime.add(1, 'second');

            assert.isFalse(segments.containsTime(time), 'time');
        });
    });

    describe('getSegmentAtTime()', () => {
        it('before start returns the start', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[0];
            const time = expectedSegment.startTime.subtract(1, 'second');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });

        it('after end returns the end', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.lastSegment;
            const time = expectedSegment.startTime
                .add(expectedSegment.duration, 'second')
                .add(5, 'seconds');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, expectedSegment.duration, 'offset');
        });

        it('time within known segment returns it', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = expectedSegment.startTime.add(1.2, 'seconds');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 1.2, 'offset');
        });

        it('time at end of known segment gets the next segment', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = segments.segments[1].startTime.add(
                segments.segments[1].duration,
                'seconds'
            );

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });

        it('time at gap gets next closest segment', async () => {
            const { segments } = getWithSparseSegments();

            const expectedSegment = segments.segments[2];
            const time = expectedSegment.startTime.subtract(2, 'seconds');

            const { segment, offset } = await segments.getSegmentAtTime(time);

            assert.equal(segment, expectedSegment, 'segment');
            assert.equal(offset, 0, 'offset');
        });
    });
});

export function getWithDenseSegments() {
    const segments = new SegmentCollection();
    const { host } = getLocator();
    const duration = 5;

    for (let i = 0; i < 5; i++) {
        segments.addSegment(
            { startTime: host.now, duration, isPartial: false },
            `test://${i}/${duration}`
        );
        host.advanceTimeBy((duration + 0.001) * 1000);
    }

    return segments;
}

export function getWithSparseSegments() {
    const segments = new SegmentCollection();
    const { host } = getLocator();

    const recordings = [
        { offset: 0, duration: 4.9 },
        { offset: 5, duration: 4.8 },
        // 5 sec gap
        { offset: 15, duration: 4.9 },
        { offset: 20, duration: 4.8 },
        { offset: 25, duration: 4.9 },
        // 5 sec gap
        { offset: 35, duration: 5 },
    ];

    const start = host.now;
    let last: Segment = null!;

    recordings.forEach(({ offset, duration }, i) => {
        last = segments.addSegment(
            { startTime: start.add(offset, 'seconds'), duration, isPartial: false },
            `test://${i}/${duration}`
        );
    });

    const durationInMs = last.startTime.add(last.duration * 1000).diff(start);
    host.advanceTimeBy(durationInMs);

    return { segments, recordings };
}
