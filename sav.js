const { argv } = require("node:process");
const { readFileSync } = require("node:fs");
const { stdout } = require("node:process");
const { load_types, Savefile, toArrayBuffer, time } = require("./common");

const file = argv[2];
const rawBuf = readFileSync(file);

const buf = toArrayBuffer(rawBuf);

const location = require("./data/LocationMarker.json");
const locs = require("./data/locs.json");
const types = require("./data/gamedata.json");

load_types(types);

const sv = new Savefile();
sv.read(buf);
const a = (key) => (sv.is_key(key) ? sv.get(key) : 0);
const b = (key) => (sv.is_key(key) ? sv.get(key) : "");
const playTimeRaw = a("PlayReport_PlayTime");
const playTime = time(playTimeRaw);
stdout.write(playTimeRaw.toString());
stdout.write(",");
stdout.write(playTime);
stdout.write(",");
stdout.write(a("CurrentRupee").toString());
stdout.write(",");
stdout.write(b("PlayerSavePosMapName"));
stdout.write(",");
