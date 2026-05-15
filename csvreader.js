autowatch = 1; // auto-reload when you save the file

var rows = [];
var timestamps = [];
var cursor = 0;
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

function bang() {
    if (rows.length === 0 || range_initialized == false) return;
    
    var row = rows[cursor % rows.length]; // loop
    for (var i = 0; i < NUM_COLS; i++) {
        var normalized_wave_val = (row[i] - min_val) / (max_val - min_val);
        outlet(i, normalized_wave_val);
    }
    cursor++;
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
    timestamps.push(timestamp);

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
    cursor = 0;
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