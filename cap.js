const { argv } = require("node:process");
const { readFileSync } = require("node:fs");
const { stdout } = require("node:process");
const { load_types, Savefile, toArrayBuffer, location_ui } = require("./common");

const file = argv[2];
const rawBuf = readFileSync(file);

const buf = toArrayBuffer(rawBuf);

const locs = require("./data/locs.json");
const types = require("./data/gamedata.json");

load_types(types);


const sv = new Savefile();
sv.read(buf);
const a = (key) => sv.is_key(key) ? sv.get(key) : 0;
const b = (key) => sv.is_key(key) ? sv.get(key) : "";

const timeStamp =  a("LastSaveTime_Lower");
const date = new Date(timeStamp * 1000);
const distr = b("SaveDistrictName");
const loc = b("SaveLocationName");
const locstr = loc
  ? ` ${location_ui(loc)} {${loc}}${locs[loc] && " (" + locs[loc] + ")"}`
  : "";
stdout.write(timeStamp.toString());
stdout.write(",");
stdout.write(
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
);
stdout.write(",");
stdout.write(`[${location_ui(distr)} {${distr}}]${locstr}`);
stdout.write(",");
