/**
 * Play a bot against Misty on paired seeds.
 *
 *   npm run match -- --challenger ./my-bot.ts --pairs 100 --seed 1 --log match.jsonl
 *
 * The challenger module exports a policy `(view, seat) => action | null` as its
 * default export or as `policy`. With no challenger, Misty plays itself.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { type XmjBotPolicy, xmjRunBotPairs, xmjSummarizeBotPairs } from './match.js';
import { xmjBotAction as misty } from './xiangqi-mahjong-bot.js';

const { values } = parseArgs({
  options: {
    challenger: { type: 'string' },
    pairs: { type: 'string', default: '100' },
    seed: { type: 'string', default: '1' },
    log: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(
    'usage: npm run match -- [--challenger <module>] [--pairs N] [--seed S] [--log file.jsonl]',
  );
  process.exit(0);
}

async function loadPolicy(path: string): Promise<XmjBotPolicy> {
  const module = await import(pathToFileURL(resolve(path)).href);
  const policy = module.default ?? module.policy;
  if (typeof policy !== 'function') {
    throw new Error(`${path} must export a policy function as default or as \`policy\``);
  }
  return policy as XmjBotPolicy;
}

const challenger = values.challenger ? await loadPolicy(values.challenger) : misty;
const pairs = Number(values.pairs);
const seed = Number(values.seed);
if (values.log) writeFileSync(values.log, '');

const results = xmjRunBotPairs(seed, pairs, challenger, misty, (pair) => {
  if (values.log) {
    const line = {
      seed: pair.seed,
      matchScore: pair.matchScore,
      taiDifference: pair.taiDifference,
      challengerEast: { winner: pair.challengerEast.winner, tai: pair.challengerEast.tai },
      challengerWest: { winner: pair.challengerWest.winner, tai: pair.challengerWest.tai },
    };
    appendFileSync(values.log, `${JSON.stringify(line)}\n`);
  }
});

const summary = xmjSummarizeBotPairs(results);
const [low, high] = summary.paired95 ?? [Number.NaN, Number.NaN];
console.log(`challenger: ${values.challenger ?? 'misty (self-play)'}`);
console.log(`seeds ${seed}..${seed + pairs - 1}, ${summary.matches} matches`);
console.log(`wins ${summary.wins}, draws ${summary.draws}, losses ${summary.losses}`);
console.log(
  `score ${(summary.matchScore * 100).toFixed(1)}% (95% ${(low * 100).toFixed(1)}..${(high * 100).toFixed(1)})`,
);
console.log(`tai difference ${summary.taiDifference}`);
console.log(`beats Misty: ${summary.beatsOpponent ? 'yes' : 'no'}`);
