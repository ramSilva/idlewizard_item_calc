# Optimizer benchmark

Full enchant sweep (levels 0–55, Resonator in and out) of each class's default guide burst setup, all items owned at maximum quality, Node v22.23.2, single thread. Regenerate with `OPTIMIZER_BENCH=1 npx vitest run src/data/optimize.test.ts`.

| Class | Sweep | Evaluations | Bound evaluations | Slowest level/branch | Levels where the best set changes |
|---|---|---|---|---|---|
| Oni | 2.6 s | 186,629 | 60,346 | 70 ms | 0, 1, 12, 14, 27, 42, 49 |
| Shaman | 8.7 s | 530,560 | 324,994 | 832 ms | 0, 1, 3, 5, 9, 10, 12, 13, 14, 27, 41, 43 |
| Temporalist | 7.7 s | 608,312 | 438,863 | 409 ms | 0, 1, 7, 11, 20, 25, 27, 31, 54 |

Total: 18.9 s.
