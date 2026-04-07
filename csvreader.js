autowatch = 1; // auto-reload when you save the file

var rows = [];
var cursor = 0;
const SELECTED_ROWS = [
    "Delta_TP9",
    "Theta_TP9",
    "Alpha_TP9",
    "Beta_TP9",
    "Gamma_TP9"
];
var selected_indices = [];
var NUM_COLS = 5; // change to match your CSV
outlets = NUM_COLS;

function bang() {
    if (rows.length === 0) return;
    
    var row = rows[cursor % rows.length]; // loop
    for (var i = 0; i < NUM_COLS; i++) {
        outlet(i, (row[i]) || 0);
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

function loadfile(path) {
    rows = [];
    cursor = 0;
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
        var line = f.readline();
        if (line === null) break; // EOF
        line = line.trim();
        if (line.length === 0) {
            post("Skipping empty line\n");
            continue;
        }
        if (line.indexOf("/muse/elements/blink") !== -1) {
            continue;
        }
        var cols = line.split(",");
        for (var c = 0; c < cols.length; c++) { cols[c] = parseFloat(cols[c]); }
        var selected_cols = [];
        for (var s = 0; s < selected_indices.length; s++) { selected_cols.push(cols[selected_indices[s]]); }
        rows.push(selected_cols);
    }
    f.close();
    post("Loaded " + rows.length + " rows\n");
}

// called when metro ticks
function anything() { bang(); }