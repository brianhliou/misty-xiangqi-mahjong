/**
 * A minimal bot: win when it can, otherwise discard its first tile and pass on
 * every other claim. Run it against Misty with
 *
 *   npm run match -- --challenger examples/first-tile.ts
 */
import type { XmjBotPolicy } from '../src/index.js';

const firstTile: XmjBotPolicy = (view) => {
  if (view.legal.nextHand) return { action: 'next-hand' };
  if (view.legal.selfDraw) return { action: 'self-draw' };
  const win = view.legal.claims.find((claim) => claim.kind === 'win');
  if (win) return { action: 'claim', kind: win.kind, fromHand: win.fromHand };
  const tile = view.legal.discard[0];
  if (tile) return { action: 'discard', tile };
  return view.legal.pass ? { action: 'pass' } : null;
};

export default firstTile;
