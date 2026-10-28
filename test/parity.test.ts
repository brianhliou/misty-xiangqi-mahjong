/**
 * Pins this package to the bot that plays on mistboard.com.
 *
 * test/fixtures/site-parity.json was recorded by running mistboard's own code
 * (the commit it names) on fixed seeds: every action Misty took in three full
 * matches, the result of 200 self-play matches, and a digest of every action
 * in those 200. If any of it changes here, this is no longer the site's bot.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { xmjPlayBotMatch } from '../src/match.js';
import { xmjBotAction } from '../src/xiangqi-mahjong-bot.js';

interface Fixture {
  botSha256: string;
  traceDigest: string;
  detailed: {
    seed: number;
    tai: [number, number];
    winner: 0 | 1 | null;
    dealIns: [number, number];
    exhaustedWalls: number;
    hands: { winner: 0 | 1 | null; selfDrawn: boolean; tai: number }[];
    actions: unknown[];
  }[];
  summary: [number, 0 | 1 | null, number, number][];
}

const fixture: Fixture = JSON.parse(
  readFileSync(new URL('./fixtures/site-parity.json', import.meta.url), 'utf8'),
);

function traced(seed: number) {
  const actions: unknown[] = [];
  const match = xmjPlayBotMatch(seed, [
    (view, seat) => {
      const action = xmjBotAction(view, seat);
      actions.push([seat, action]);
      return action;
    },
    (view, seat) => {
      const action = xmjBotAction(view, seat);
      actions.push([seat, action]);
      return action;
    },
  ]);
  return { match, actions: JSON.parse(JSON.stringify(actions)) as unknown[] };
}

test('the bot source is byte-identical to the site bot', () => {
  const source = readFileSync(new URL('../src/xiangqi-mahjong-bot.ts', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), fixture.botSha256);
});

test('three full matches replay action for action', () => {
  for (const want of fixture.detailed) {
    const { match, actions } = traced(want.seed);
    assert.deepEqual(actions, want.actions, `seed ${want.seed}`);
    assert.deepEqual(match.tai, want.tai);
    assert.equal(match.winner, want.winner);
    assert.deepEqual(match.dealIns, want.dealIns);
    assert.equal(match.exhaustedWalls, want.exhaustedWalls);
    assert.deepEqual(
      match.results.map((r) => ({
        winner: r.winner,
        selfDrawn: r.selfDrawn,
        tai: r.score?.total ?? 0,
      })),
      want.hands,
    );
  }
});

test('200 self-play matches end as they do on the site', () => {
  const all: unknown[] = [];
  for (const [seed, winner, east, west] of fixture.summary) {
    const { match, actions } = traced(seed);
    all.push(actions);
    assert.deepEqual([match.winner, match.tai[0], match.tai[1]], [winner, east, west], `${seed}`);
  }
  assert.equal(createHash('sha256').update(JSON.stringify(all)).digest('hex'), fixture.traceDigest);
});
