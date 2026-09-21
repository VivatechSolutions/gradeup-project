# Avatar model benchmark

Measures the two jobs the avatar classroom gives a model — judging a teaching
picture, and writing a lesson script — using the **real production prompts**
imported from `avatar_visuals.py` and `enrichment_pipeline.py`. Nothing here is
a paraphrase, so a model that wins here wins the job it will actually be given.

## Layout

| path | what it is |
|---|---|
| `avatar_model_bench.py` | the runner — both suites, scoring, and the comparison tables |
| `avatar_bench_fixtures.py` | the labelled image set: pinned URLs + hand-written verdicts |
| `fixtures/` | the built images and `manifest.json` (14 cases) |
| `results/` | saved runs, newest wins |

## Running

```bash
venv/Scripts/python.exe bench/avatar_model_bench.py --suite vision
```

```bash
venv/Scripts/python.exe bench/avatar_model_bench.py --suite teaching
```

`--suite all` runs both. `--repeat N` averages N passes. `--models a,b` overrides
the candidate list. Rebuild the images with
`venv/Scripts/python.exe bench/avatar_bench_fixtures.py --force`.

## The five fixture classes

| class | n | correct verdict | why it is in the set |
|---|---|---|---|
| `CLEAN` | 4 | **accept** | real English labelled diagrams, asked about their own topic |
| `WATERMARK` | 4 | reject | the same images with a stock-preview stamp burned into the pixels |
| `OFFTOPIC` | 4 | reject | the same images, asked about an unrelated subject |
| `FOREIGN` | 1 | reject | **English filename, Romanian in-picture labels** |
| `UNLABELLED` | 1 | reject | a worksheet whose pointer lines all lead to blank space |

`WATERMARK` and `OFFTOPIC` are derived from the `CLEAN` images, so no model can
score well through a blanket bias: accepting everything fails four classes,
rejecting everything fails `CLEAN`.

`FOREIGN` and `UNLABELLED` are the cases that justify paying for a vision model
at all — neither is detectable from the URL, the host or the title, so they
measure precisely what the vision gate adds over the cheap filters ahead of it.

## Two things this benchmark learned the hard way

**Ground truth has to be looked at.** The first fixture build harvested images
automatically and labelled the top hit `CLEAN`. Inspection showed five of six
were images the gate is *supposed to reject* — a Kurdish heart, a Russian plant
cell, a French regional volcano section, a moons poster for "planet order", and
a blank worksheet. A wrong answer key marks every model wrong. Every case is now
pinned by URL with a verdict written by hand after viewing it.

**Never let a failure score as a success.** The original `gate_score` subtracted
penalties from 1.0, which handed `gpt-4o-mini` — whose every call returned
`credit_balance_exhausted` — a perfect **1.00**, because a model that never
answers commits no errors. Scoring is now mean per-case credit: correct `+1`,
false reject or failed call `0`, and a **false accept `−2`**, because putting a
watermarked picture in front of a student is worse than showing none.

## Results that set the current config

Vision gate, 14 cases, after the blank-worksheet prompt fix:

| model | gate | acc | false accepts | watermarks | sec | $/call |
|---|---|---|---|---|---|---|
| **google/gemini-2.5-flash** | **0.93** | 0.93 | **0** | 4/4 | 3.1 | 0.00123 |
| qwen/qwen3-vl-235b-a22b-instruct | 0.79 | 0.93 | 1 | 3/4 | 7.4 | 0.00062 |
| meta-llama/llama-4-scout | 0.57 | 0.86 | 2 | 4/4 | 4.2 | 0.00029 |

Teaching script: llama `0.92` / gemini `0.90` / qwen `0.85`, at 25.3s / 8.7s /
39.7s. Gemini's speed is why the live engine and the avatar enrichment path use
it while general and maths enrichment stay on Llama.

OpenAI is deliberately absent from the candidate list — the account is out of
credits, so including it would only measure a dead key.
