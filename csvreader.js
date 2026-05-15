autowatch = 1; // auto-reload when you save the file

var rows = [];
var timestamps = []; // ms offset from first row
var t0 = 0; // first row's raw timestamp, used to zero-base the rest
const SELECTED_ROWS = [
    "Delta_TP9",
    "Theta_TP9",
    "Alpha_TP9",
    "Beta_TP9",
    "Gamma_TP9"
];
var selected_indices = [];
var NUM_COLS = 5;
outlets = NUM_COLS;
inlets = 3;
var current_beats = 0;
var bpm = 120; // default until patcher sends it
var current_time_ms = 0;

var range_initialized = false;
var min_val = 0.0;
var max_val = 0.0;

function parsetimestamp(s) {
    post("Parsing timestamp: " + s + "\n");
    return new Date(s.replace(" ", "T")).getTime();
}

function update_current_time() {
    var ms = current_beats * (60000 / bpm);
    current_time_ms = ms;
}

function msg_float(v) {
    // inlet 1: absolute sample count from plugsync~ outlet 8
    if (inlet == 1) {
        current_beats = v;  // plugsync~ outlet 7 via snapshot~
    }
    // inlet 2: bpm from patcher
    else if (inlet == 2) {
        bpm = v;
    }
    update_current_time();
}

function findrow(t) {
    // binary search for i where timestamps[i] <= t < timestamps[i+1]
    var lo = 0, hi = timestamps.length - 2;
    while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (timestamps[mid] <= t) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

function bang() {
    if (rows.length === 0 || range_initialized == false) return;

    var total_duration = timestamps[timestamps.length - 1];
    if (total_duration <= 0) return;

    var t = current_time_ms % total_duration;
    var i = findrow(t);
    var j = i + 1 < rows.length ? i + 1 : i;
    var span = timestamps[j] - timestamps[i];
    var frac = span > 0 ? (t - timestamps[i]) / span : 0;
    var range = max_val - min_val;

    for (var c = 0; c < NUM_COLS; c++) {
        var val = rows[i][c] + (rows[j][c] - rows[i][c]) * frac;
        var normalized = range > 0 ? (val - min_val) / range : 0;
        outlet(c, normalized);
    }
}

function parseheader(header) {
    var header_cols = header.split(",");
    for (var i = 0; i < header_cols.length; i++) { header_cols[i] = header_cols[i].trim(); }
    for (var i = 0; i < SELECTED_ROWS.length; i++) {
        var idx = header_cols.indexOf(SELECTED_ROWS[i]);
        if (idx === -1) {
            post("Column not found: " + SELECTED_ROWS[i] + "\n");
            return false;
        } else {
            selected_indices.push(idx);
        }
    }
    return true;
}

function updaterange(floatval) {
    if (!range_initialized) {
        min_val = floatval;
        max_val = floatval;
        range_initialized = true;
        return;
    }

    min_val = Math.min(min_val, floatval);
    max_val = Math.max(max_val, floatval);
}

function readrow(line) {
    line = line.trim();
    if (line.length === 0) {
        post("Skipping empty line\n");
        return null;
    }
    if (line.indexOf("/muse/elements/blink") !== -1) {
        return null;
    }
    var cols = line.split(",");
    var timestamp = parsetimestamp(cols[0]); // assuming timestamp is in the first column
    if (timestamps.length === 0) t0 = timestamp;
    timestamps.push(timestamp - t0);

    for (var c = 0; c < cols.length; c++) { cols[c] = parseFloat(cols[c]); }
    var selected_cols = [];
    for (var s = 0; s < selected_indices.length; s++) {
        var floatval = cols[selected_indices[s]];
        updaterange(floatval);
        selected_cols.push(floatval);
    }
    return selected_cols;
}

function loadfile(path) {
    rows = [];
    timestamps = [];
    t0 = 0;
    range_initialized = false;
    selected_indices = [];
    var f = new File(path, "read");
    if (!f.isopen) {
        post("Could not open file: " + path + "\n");
        return;
    }
    var header = f.readline();
    if (!parseheader(header)) {
        post("Failed to parse header\n");
        return;
    }
    while (f.eof != 0) {
        var line = f.readline(10000);
        if (line === null) break; // EOF
        selected_cols = readrow(line);
        if (selected_cols === null) continue; // empty or invalid row
        rows.push(selected_cols);
    }
    f.close();
    post("Loaded " + rows.length + " rows\n");
}

// called when metro ticks
function anything() { bang(); }