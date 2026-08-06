import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapSeasonInfoToContextFields } from './season-context';
import type { SdvSeasonInfo } from './espn-types';

const season2026: SdvSeasonInfo = {
  year: 2026,
  startDate: '2026-02-01T08:00Z',
  endDate: '2027-01-28T07:59Z',
  displayName: '2026',
  type: {
    type: 1,
    name: 'Preseason',
    abbreviation: 'pre',
    startDate: '2026-02-01T08:00Z',
    endDate: '2026-08-22T06:59Z',
    week: { number: 1, text: 'Week 1' },
  },
  types: {
    items: [
      {
        type: 1,
        name: 'Preseason',
        abbreviation: 'pre',
        startDate: '2026-02-01T08:00Z',
        endDate: '2026-08-22T06:59Z',
      },
      {
        type: 2,
        name: 'Regular Season',
        abbreviation: 'reg',
        startDate: '2026-08-22T07:00Z',
        endDate: '2026-12-13T07:59Z',
      },
      {
        type: 3,
        name: 'Postseason',
        abbreviation: 'post',
        startDate: '2026-12-13T08:00Z',
        endDate: '2027-01-28T07:59Z',
      },
      {
        type: 4,
        name: 'Off Season',
        abbreviation: 'off',
        startDate: '2027-01-28T08:00Z',
        endDate: '2027-02-01T07:59Z',
      },
    ],
  },
};

const season2025: SdvSeasonInfo = {
  year: 2025,
  startDate: '2025-02-01T08:00Z',
  endDate: '2026-01-21T07:59Z',
  type: {
    type: 3,
    name: 'Postseason',
    abbreviation: 'post',
    startDate: '2025-12-13T08:00Z',
    endDate: '2026-01-21T07:59Z',
  },
  types: {
    items: [
      {
        type: 1,
        name: 'Preseason',
        abbreviation: 'pre',
        startDate: '2025-02-01T08:00Z',
        endDate: '2025-08-23T06:59Z',
      },
      {
        type: 2,
        name: 'Regular Season',
        abbreviation: 'reg',
        startDate: '2025-08-23T07:00Z',
        endDate: '2025-12-13T07:59Z',
      },
      {
        type: 3,
        name: 'Postseason',
        abbreviation: 'post',
        startDate: '2025-12-13T08:00Z',
        endDate: '2026-01-21T07:59Z',
      },
      {
        type: 4,
        name: 'Off Season',
        abbreviation: 'off',
        startDate: '2026-01-21T08:00Z',
        endDate: '2026-02-01T07:59Z',
      },
    ],
  },
};

describe('mapSeasonInfoToContextFields', () => {
  it('marks 2026 as preseason/active during August preseason window', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    const ctx = mapSeasonInfoToContextFields(season2026, 2026, 2026, now);
    assert.equal(ctx.phase, 'preseason');
    assert.equal(ctx.isActive, true);
    assert.equal(ctx.seasonStarted, false);
    assert.equal(ctx.firstGameDate, '2026-08-22T07:00Z');
    assert.equal(ctx.activeTypeId, 1);
    assert.ok(ctx.startDate);
    assert.ok(ctx.endDate);
  });

  it('marks 2025 as offseason when viewing after season end', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    const ctx = mapSeasonInfoToContextFields(season2025, 2025, 2026, now);
    assert.equal(ctx.phase, 'offseason');
    assert.equal(ctx.isActive, false);
    assert.equal(ctx.seasonStarted, true);
    assert.equal(ctx.firstGameDate, '2025-08-23T07:00Z');
  });

  it('uses regular-season window when now is inside it', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    const ctx = mapSeasonInfoToContextFields(season2026, 2026, 2026, now);
    assert.equal(ctx.phase, 'regular');
    assert.equal(ctx.isActive, true);
    assert.equal(ctx.seasonStarted, true);
    assert.equal(ctx.activeTypeId, 2);
  });
});
