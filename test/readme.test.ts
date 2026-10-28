/** The README's measured number comes from this run; prose and run must agree. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import firstTile from '../examples/first-tile.js';
import { xmjRunBotPairs, xmjSummarizeBotPairs } from '../src/match.js';

test('the README states the example-bot match as it plays', () => {
  const summary = xmjSummarizeBotPairs(xmjRunBotPairs(1, 100, firstTile));
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
  // The example bot is the challenger, so its losses are Misty's wins.
  const line = `Misty won ${summary.losses} matches, drew ${summary.draws} and lost ${summary.wins}.`;
  assert.ok(readme.includes(line), `README should say: ${line}`);
});
