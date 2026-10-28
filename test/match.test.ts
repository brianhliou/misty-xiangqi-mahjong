import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type XmjBotPolicy,
  xmjMatchWalls,
  xmjPlayBotMatch,
  xmjRunBotPairs,
  xmjSummarizeBotPairs,
} from '../src/match.js';
import { xmjBotAction as misty } from '../src/xiangqi-mahjong-bot.js';
import type { XmjSeat } from '../src/xiangqi-mahjong-room.js';

/** A weak bot: discards its first tile and never claims or wins off a discard. */
const decline: XmjBotPolicy = (view) => {
  const tile = view.legal.discard[0];
  if (tile) return { action: 'discard', tile };
  return view.legal.pass ? { action: 'pass' } : null;
};

test('a match is deterministic, alternates dealers, and books the rules results', () => {
  const one = xmjPlayBotMatch(42, [misty, decline]);
  assert.deepEqual(xmjPlayBotMatch(42, [misty, decline]), one);
  assert.equal(one.results.length, 6);
  assert.deepEqual(
    one.results.map((r) => r.dealer),
    [0, 1, 0, 1, 0, 1],
  );
  for (const seat of [0, 1] as const) {
    assert.equal(
      one.tai[seat],
      one.results
        .filter((r) => r.winner === seat)
        .reduce((sum, r) => sum + (r.score?.total ?? 0), 0),
    );
    assert.equal(
      one.dealIns[seat],
      one.results.filter((r) => r.winner === 1 - seat && !r.selfDrawn).length,
    );
  }
  assert.equal(one.exhaustedWalls, one.results.filter((r) => r.winner === null).length);
  assert.notDeepEqual(xmjMatchWalls(42), xmjMatchWalls(43));
});

test('paired seeds swap the two bots on identical walls', () => {
  const challengerSeats = new Set<XmjSeat>();
  const opponentSeats = new Set<XmjSeat>();
  const pair = xmjRunBotPairs(
    49,
    1,
    (view, seat) => {
      challengerSeats.add(seat);
      return decline(view, seat);
    },
    (view, seat) => {
      opponentSeats.add(seat);
      return misty(view, seat);
    },
  )[0];
  assert.ok(pair);
  assert.deepEqual([...challengerSeats], ['east', 'west']);
  assert.deepEqual([...opponentSeats], ['west', 'east']);
  assert.deepEqual(pair.challengerEast, xmjPlayBotMatch(49, [decline, misty]));
  assert.deepEqual(pair.challengerWest, xmjPlayBotMatch(49, [misty, decline]));
});

test('Misty against itself scores one half and does not beat itself', () => {
  const pairs = xmjRunBotPairs(9, 1, misty);
  const pair = pairs[0];
  assert.ok(pair);
  assert.deepEqual(pair.challengerEast.results, pair.challengerWest.results);
  assert.equal(pair.matchScore, 0.5);
  assert.equal(pair.taiDifference, 0);
  const summary = xmjSummarizeBotPairs(pairs);
  assert.equal(summary.matches, 2);
  assert.equal(summary.matchScore, 0.5);
  assert.equal(summary.paired95, null, 'one seed pair cannot establish uncertainty');
  assert.equal(summary.beatsOpponent, false);
  assert.throws(() => xmjRunBotPairs(1, 0, misty), RangeError);
});

test('a weak bot loses to Misty and does not clear the bar', () => {
  const summary = xmjSummarizeBotPairs(xmjRunBotPairs(1, 20, decline));
  assert.ok(summary.matchScore < 0.5, `score ${summary.matchScore}`);
  assert.equal(summary.beatsOpponent, false);
});

test('bots receive redacted views, and an illegal action fails the match', () => {
  let calls = 0;
  const inspect: XmjBotPolicy = (view, seat) => {
    const wire = JSON.parse(JSON.stringify(view));
    assert.equal(wire.hands[seat === 'east' ? 'west' : 'east'], null);
    assert.equal('walls' in wire, false);
    assert.equal('wall' in wire, false);
    calls += 1;
    return misty(view, seat);
  };
  xmjPlayBotMatch(2, [inspect, inspect]);
  assert.ok(calls > 6);
  assert.throws(() => xmjPlayBotMatch(2, [() => ({ action: 'self-draw' }), misty]), /illegal/);
  assert.throws(() => xmjMatchWalls(-1), RangeError);
});

test('beating Misty takes 55% or better over at least 200 matches', () => {
  const pair = xmjRunBotPairs(3, 1, misty)[0];
  assert.ok(pair);
  const win = {
    ...pair,
    challengerEast: { ...pair.challengerEast, winner: 0 as const },
    challengerWest: { ...pair.challengerWest, winner: 1 as const },
    matchScore: 1,
  };
  const loss = {
    ...pair,
    challengerEast: { ...pair.challengerEast, winner: 1 as const },
    challengerWest: { ...pair.challengerWest, winner: 0 as const },
    matchScore: 0,
  };
  const run = (pairs: number, won: number) =>
    Array.from({ length: pairs }, (_, i) => ({ ...(i < won ? win : loss), seed: i }));
  const hundred = xmjSummarizeBotPairs(run(100, 55));
  assert.equal(hundred.matches, 200);
  assert.equal(hundred.matchScore, 0.55);
  assert.equal(hundred.wins, 110);
  assert.equal(hundred.beatsOpponent, true);
  // The interval stays honest: 55% over 200 matches could still be a coin flip.
  assert.ok((hundred.paired95?.[0] ?? 1) < 0.5);
  assert.equal(xmjSummarizeBotPairs(run(100, 54)).beatsOpponent, false);
  assert.equal(xmjSummarizeBotPairs(run(99, 99)).beatsOpponent, false, 'too few matches');
  assert.throws(() => xmjSummarizeBotPairs(run(100, 55), { minimumScore: Number.NaN }), RangeError);
});
