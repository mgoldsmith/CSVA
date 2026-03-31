# CSVA — Max for Live MIDI Effect

## What This Is

A Max for Live MIDI Effect device that reads rows from a CSV file (via `csvreader.js`) and maps the values to Ableton Live parameters. Each bang/metro tick advances one row, outputting values to up to 5 mapping channels with offset and depth controls.

## Files

| File | Description |
|------|-------------|
| `CSVA.amxd` | Compiled Max for Live device |
| `csvreader.js` | JS module loaded inside the device — parses CSV, outputs one row per bang |
| `automation.csv` | 600-row test file, 5 columns, smooth normalized curves (0–1) |
| `automation_erratic.csv` | 600-row test file, 5 columns, erratic normalized values (0–1) |
| `JN_alpha_clean_absolute.csv` | 129-row Muse EEG recording, 43 columns, **not normalized** |

## How csvreader.js Works

- `NUM_COLS = 5` — hardcoded column count; must match the CSV being used
- `outlets = NUM_COLS` — one Max outlet per column
- `loadfile(path)` — reads file line-by-line, splits by comma, converts each cell via `parseFloat`
- `bang()` / `anything()` — outputs the current row to all outlets, then increments cursor; loops on end
- **No header-skipping logic** — a header row will be parsed as NaN values

## JN_alpha_clean_absolute.csv Structure

Data from a Muse 2 EEG headband, ~90 seconds at ~1 Hz (129 rows).

| Column Index | Name | Notes |
|---|---|---|
| 0 | TimeStamp | ISO 8601 string — `parseFloat` gives NaN |
| 1–4 | Delta_TP9/AF7/AF8/TP10 | Log power, range roughly 0.3–1.6 |
| 5–8 | Theta_TP9/AF7/AF8/TP10 | Log power |
| 9–12 | Alpha_TP9/AF7/AF8/TP10 | Log power |
| 13–16 | Beta_TP9/AF7/AF8/TP10 | Log power |
| 17–20 | Gamma_TP9/AF7/AF8/TP10 | Log power |
| 21–24 | RAW_TP9/AF7/AF8/TP10 | Raw ADC, range ~700–1000 |
| 25 | AUX_RIGHT | Raw ADC |
| 26–28 | Accelerometer_X/Y/Z | ~±1g |
| 29–31 | Gyro_X/Y/Z | deg/s |
| 32–34 | PPG_Ambient/IR/Red | Large integers |
| 35 | Heart_Rate | ~107 BPM (constant in this recording) |
| 36 | HeadBandOn | 1.0 or 0.0 |
| 37–40 | HSI_TP9/AF7/AF8/TP10 | Signal quality (1.0 = good) |
| 41 | Battery | 45.0 |
| 42 | Elements | String or empty — eye blink events `/muse/elements/blink` |

## Adjustments Needed to Use JN_alpha_clean_absolute.csv

1. **Header row** — the first row is a header. `parseFloat` will produce NaN for all string fields. Need to skip row 0 (or strip the header before loading).

2. **Column 0 is a timestamp string** — `parseFloat("2026-02-05 12:37:39.787")` = NaN. Skip or exclude it.

3. **Column 42 (Elements) is a string** — `parseFloat("")` = NaN, `parseFloat("/muse/...")` = NaN. Skip or exclude.

4. **Values are not normalized to 0–1** — EEG band power values are log-scale (~0.3–2.0), raw values are in hundreds. The M4L device expects 0–1 input. Need to normalize selected columns before or inside the device.

5. **43 columns vs 5** — must decide which columns to use and set `NUM_COLS` accordingly (or select a subset of column indices to output).

6. **Sparse rows** — some rows (blink events) have many empty cells, which parse to NaN.

## Likely Next Steps

- Add header-skip logic to `loadfile()` (skip first row if it contains non-numeric data)
- Add column selection: instead of outputting columns 0–N sequentially, output a configurable list of column indices
- Add per-column normalization (min/max scaling) so values land in 0–1 for the M4L mapping chain
- Decide which EEG bands/channels are most musically useful (Alpha and Theta are common for music BCI work)
- Handle NaN gracefully (output 0 or hold previous value)
