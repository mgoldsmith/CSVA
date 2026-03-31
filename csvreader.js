autowatch = 1; // auto-reload when you save the file

var rows = [];
var cursor = 0;
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

function loadfile(path) {
    rows = [];
    cursor = 0;
    var f = new File(path, "read");
    if (!f.isopen) {
        post("Could not open file: " + path + "\n");
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
        var cols = line.split(",").map(parseFloat);
        rows.push(cols);
    }
    f.close();
    post("Loaded " + rows.length + " rows\n");
}

// called when metro ticks
function anything() { bang(); }