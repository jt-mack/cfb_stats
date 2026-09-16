import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapAthleteCore, mapAthleteStats } from './athlete-mappers';
import type { SdvAthleteCore } from './espn-types';

const stocktonCore: SdvAthleteCore = {
  id: '4685578',
  firstName: 'Gunner',
  lastName: 'Stockton',
  fullName: 'Gunner Stockton',
  displayName: 'Gunner Stockton',
  shortName: 'G. Stockton',
  weight: 215,
  displayWeight: '215 lbs',
  height: 73,
  displayHeight: '6\' 1"',
  slug: 'gunner-stockton',
  headshot: {
    href: 'https://a.espncdn.com/i/headshots/college-football/players/full/4685578.png',
    alt: 'Gunner Stockton',
  },
  jersey: '14',
  flag: {
    href: 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png',
    alt: 'USA',
  },
  birthPlace: { city: 'Tiger', state: 'GA', country: 'USA' },
  birthCountry: { abbreviation: 'USA' },
  position: {
    id: '8',
    name: 'Quarterback',
    displayName: 'Quarterback',
    abbreviation: 'QB',
  },
  team: {
    $ref: 'http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/teams/61?lang=en&region=us',
  },
  experience: { years: 4, displayValue: 'Senior', abbreviation: 'SR' },
  active: true,
  status: { id: '1', name: 'Active', type: 'active', abbreviation: 'Active' },
  links: [
    {
      rel: ['playercard', 'desktop', 'athlete'],
      href: 'https://www.espn.com/college-football/player/_/id/4685578/gunner-stockton',
      text: 'Player Card',
    },
    {
      rel: ['stats', 'sportscenter', 'app', 'athlete'],
      href: 'sportscenter://x-callback-url/showClubhouse?uid=s:20~l:23~a:4685578&section=stats',
      text: 'Stats',
    },
    {
      rel: ['stats', 'desktop', 'athlete'],
      href: 'https://www.espn.com/college-football/player/stats/_/id/4685578/gunner-stockton',
      text: 'Stats',
    },
  ],
};

describe('mapAthleteCore', () => {
  it('maps core identity, bio, and team id from the ESPN athlete document', () => {
    const athlete = mapAthleteCore(stocktonCore);
    assert.equal(athlete.id, '4685578');
    assert.equal(athlete.displayName, 'Gunner Stockton');
    assert.equal(athlete.jersey, '14');
    assert.equal(athlete.position, 'QB');
    assert.equal(athlete.positionName, 'Quarterback');
    assert.equal(athlete.experience, 'Senior');
    assert.equal(athlete.birthPlace, 'Tiger, GA');
    assert.equal(athlete.teamId, 61);
    assert.equal(athlete.active, true);
    assert.equal(athlete.status, 'Active');
    assert.equal(
      athlete.headshot,
      'https://a.espncdn.com/i/headshots/college-football/players/full/4685578.png'
    );
  });

  it('keeps unique desktop ESPN links and drops sportscenter URLs', () => {
    const athlete = mapAthleteCore(stocktonCore);
    assert.deepEqual(athlete.links, [
      {
        href: 'https://www.espn.com/college-football/player/_/id/4685578/gunner-stockton',
        text: 'Player Card',
      },
      {
        href: 'https://www.espn.com/college-football/player/stats/_/id/4685578/gunner-stockton',
        text: 'Stats',
      },
    ]);
  });
});

describe('mapAthleteStats', () => {
  it('maps category labels, season rows, and career totals', () => {
    const mapped = mapAthleteStats({
      teams: {
        'georgia-bulldogs': { id: '61', abbreviation: 'UGA', shortDisplayName: 'Georgia' },
      },
      categories: [
        {
          name: 'passing',
          displayName: 'Passing',
          labels: ['CMP', 'ATT', 'YDS'],
          statistics: [
            {
              teamId: '61',
              teamSlug: 'georgia-bulldogs',
              season: { year: 2023, displayName: '2023' },
              stats: ['12', '19', '148'],
              position: 'QB',
            },
          ],
          totals: ['354', '501', '3,918'],
        },
      ],
    });
    assert.equal(mapped.categories.length, 1);
    assert.equal(mapped.categories[0].displayName, 'Passing');
    assert.deepEqual(mapped.categories[0].labels, ['CMP', 'ATT', 'YDS']);
    assert.equal(mapped.categories[0].seasons[0].team, 'UGA');
    assert.equal(mapped.categories[0].seasons[0].season, 2023);
    assert.deepEqual(mapped.categories[0].seasons[0].values, ['12', '19', '148']);
    assert.deepEqual(mapped.categories[0].totals, ['354', '501', '3,918']);
  });
});
