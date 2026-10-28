# MistyXiangqiMahjong

[![ci](https://github.com/brianhliou/misty-xiangqi-mahjong/actions/workflows/ci.yml/badge.svg)](https://github.com/brianhliou/misty-xiangqi-mahjong/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/brianhliou/misty-xiangqi-mahjong)](https://github.com/brianhliou/misty-xiangqi-mahjong/releases/latest)
[![license: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

Misty is the xiangqi mahjong bot on mistboard.com, published here exactly as it plays there. It is a
heuristic bot with no search: it counts how many tiles its hand is short of a win and makes the move
that leaves it closest. This repo holds the bot, the two-player rules it plays by, and a match
harness for playing your own bot against it. It is an open challenge: build a bot that beats Misty
in a match and it takes the Xiangqi Mahjong title on mistboard.com.

**Play it in your browser:** challenge Misty on
[mistboard.com](https://mistboard.com/?play=computer&gameSpecId=xiangqi-mahjong). No install required.

## The game

Xiangqi mahjong (象棋麻將) uses the 32 pieces of a xiangqi set as tiles. This is the Taiwan form, for
two players. A hand is five tiles, and a winning hand is one set of three plus a pair. A set is three
matching soldiers, or one colour's general, advisor and elephant, or one colour's chariot, horse and
cannon. A pair is two identical tiles, or the red and black generals together.

Each turn you draw a tile and discard one. You can claim your opponent's discard to win, or to finish
a set with two tiles from your hand, which you then lay face up. A win scores points (tai) from a
table: a hand of one colour, the pair of generals, five soldiers, a win on your own draw, and more. A
match is six hands, each seat deals three, and the higher total wins. The full rules are on
[mistboard.com](https://mistboard.com/rules/xiangqi-mahjong-32).

## Strength

Misty sees only what a player at its seat sees: its own hand, both sides' exposed sets and discards,
and the number of tiles left in the wall. It looks no further ahead than the next tile.

Over seeds 1 to 100, each dealt twice with the seats swapped, Misty played the example bot in
[`examples/first-tile.ts`](examples/first-tile.ts), which wins when it can and otherwise discards its
first tile. Misty won 177 matches, drew 2 and lost 21.

A bot that scores 55% or better against Misty over 200 matches, 100 from each seat, takes the
Xiangqi Mahjong title on mistboard.com, with your name on it; the terms are at
[mistboard.com/champions](https://mistboard.com/champions#challenge).
To challenge, open an issue here with a link to your bot.

## Play your bot against Misty

```bash
npm install
npm run match -- --challenger examples/first-tile.ts --pairs 100 --seed 1 --log match.jsonl
```

A bot is a module whose default export is a function `(view, seat) => action | null`. `seat` is
`'east'` or `'west'`. `view` is the player view the site sends to that seat, with the legal actions
in `view.legal`; the opponent's concealed hand is `null` and the wall order is never in it. Each seed
deals the same six walls twice, once with your bot in each seat, so both bots play both sides of
every deal. The run prints wins, draws and losses, the score with a 95% interval, and whether it
clears the 55% bar. `--log` writes one line per seed.

## How it works

Misty measures a hand by its distance: how many tiles it is short of the nearest winning hand whose
missing tiles are still unseen, and how many unseen tiles would close that gap (its outs). It wins
whenever a win is legal, on its own draw or off a discard. It claims a discard to make a set only
when that leaves it strictly fewer tiles from a win, because a claim spends the draw and shows the
hand. Otherwise it discards the tile whose loss leaves it closest to a win, and breaks a tie toward
more outs.

The bot, rules and room code are the files mistboard.com runs. `test/parity.test.ts` checks that the
bot file is byte-identical to the site's and replays matches recorded from the site's code, action
for action.

## Build & test

You need Node 22 or later.

```bash
npm install
npm run typecheck
npm test
```

## Layout

- `src/xiangqi-mahjong-bot.ts`: Misty.
- `src/xiangqi-mahjong.ts`: the rules: tiles, sets, claims, scoring and the six-hand match.
- `src/xiangqi-mahjong-room.ts`: turns, claim windows and the player view each seat receives.
- `src/match.ts`, `src/cli.ts`: the paired-seed match harness and its command line.
- `examples/first-tile.ts`: a minimal bot to start from.
- `test/`: rules, room and harness tests, the README check, and the parity test against the site.

## License

AGPL-3.0-or-later, see [LICENSE](LICENSE).
