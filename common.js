/*
BSD 2-Clause License

Copyright (c) 2024, savage13

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

const location = require("./data/LocationMarker.json");

function isBoolean(n) { return typeof n == "boolean"; }
function isInt(n) { return Number(n) === n && n % 1 === 0; }
function isFloat(n) { return Number(n) === n; }
function isString(n) { return typeof n === 'string' || n instanceof String; }
function isArray(n) { return Array.isArray(n); }
function isStringArray(n) { return isArray(n) && n.every(isString); }
function isS32Array(n) { return isArray(n) && n.every(isInt); }
function isF32Array(n) { return isArray(n) && n.every(isFloat); }
function isBooleanArray(n) { return isArray(n) && n.every(isBoolean); }
function isVector2f(n) { return isF32Array(n) && n.length == 2; }
function isVector3f(n) { return isF32Array(n) && n.length == 3; }
function isVector4f(n) { return isF32Array(n) && n.length == 4; }
function isVector2fArray(n) { return isArray(n) && n.every(isVector2f); }
function isVector3fArray(n) { return isArray(n) && n.every(isVector2f); }
async function read_file(filename) {
    if (ON_SWITCH) {
        return Switch.readFileSync(filename);
    }
    else {
        const res = await fetch(filename);
        return await res.arrayBuffer();
    }
}
async function read_json(filename) {
    if (ON_SWITCH) {
        let buffer = Switch.readFileSync(new URL(filename, Switch.entrypoint));
        if (!buffer)
            return undefined;
        return JSON.parse(new TextDecoder().decode(buffer));
    }
    else {
        const res = await fetch('romfs/' + filename);
        return res.json();
    }
}
let TYPES = {};
async function load_types(data = types) {
    load_types_from_data(data);
}
function load_types_from_data(data) {
    let buf = new ArrayBuffer(4);
    let u32 = new Uint32Array(buf);
    let s32 = new Int32Array(buf);
    for (const key of Object.keys(data)) {
        s32[0] = parseInt(key);
        TYPES[u32[0]] = data[key];
    }
}
const VERSIONS = {
    0x24E2: '1.0.0',
    0x24EE: '1.1.0',
    0x2588: '1.2.0',
    0x29C0: '1.3.0',
    0x2A46: '1.3.1',
    0x3EF8: '1.3.3',
    0x3EF9: '1.3.4',
    //0x471A: '1.4.0',
    0x471A: '1.4.1',
    0x471B: '1.5.0',
    0x471E: '1.6.0',
};
const SIZES = {
    0x24E2: 896976,
    0x24EE: 897160,
    0x2588: 897112,
    0x29C0: 907824,
    0x2A46: 907824,
    0x3EF8: 1020648,
    0x3EF9: 1020648,
    //0x471A: '1.4.0',
    0x471A: 1027208,
    0x471B: 1027208,
    0x471E: 1027216,
};
class Savefile {
    constructor() {
        this.size = 0;
        this.dv = new DataView(new ArrayBuffer(4));
        this.version = 0;
        this.marker = 0;
        this._unknown = 0;
        this.order = true;
        this.buf = new ArrayBuffer(4);
        this.off = {};
        this._backup = new ArrayBuffer(4);
    }
    raw() {
        return this.buf;
    }
    clone() {
        const s = new Savefile();
        let buf = new ArrayBuffer(this.size);
        new Uint8Array(buf).set(new Uint8Array(this.buf));
        s.read(buf);
        return s;
    }
    read(buf) {
        this.size = buf.byteLength;
        this.buf = buf;
        this.dv = new DataView(this.buf);
        this.order = true;
        // Determine the byte order
        this._unknown = this.dv.getUint32(8, this.order);
        this.order = this._unknown == 0x1;
        if (!this.order)
            this._unknown = this.dv.getUint32(0, this.order);
        if (this._unknown != 0x1)
            return false;
        this.version = this.dv.getUint32(0, this.order);
        this.marker = this.dv.getUint32(4, this.order);
        if (!(this.version in VERSIONS))
            return { status: false, msg: `Unknown version ${this.version}` };
        if (this.marker != 0xffffffff)
            return { status: false, msg: `Marker not 0xffffffff ${this.marker}` };
        if (this.size > 3000 && SIZES[this.version] != this.size)
            return {
                status: false,
                msg: `Unknown file size ${this.size} ${VERSIONS[this.version]} ${SIZES[this.version]}`
            };
        // Read in offsets
        let off = 12;
        while (off + 4 < this.size) {
            let id = this.dv.getUint32(off, this.order);
            if (id in this.off) {
                if (off < this.off[id])
                    this.off[id] = off;
            }
            else {
                this.off[id] = off;
            }
            off += 8;
        }
        return { status: true, msg: "" };
    }
    type(key) {
        let index = undefined;
        if (key.includes('[')) {
            let v = key.split("[");
            key = v[0];
            index = parseInt(v[1].replace("]", ""));
        }
        const hash = crc32(key);
        const kind = TYPES[hash];
        if (index == undefined)
            return kind;
        const out_types = {
            "vector2f": "f32",
            "vector3f": "f32",
            "vector4f": "f32",
            "f32_array": "f32",
            "s32_array": "s32",
            "bool_array": "bool",
            "string_array": "string",
            "string64_array": "string",
            "string256_array": "string",
        };
        return out_types[kind];
    }
    backup() {
        this._backup = new ArrayBuffer(this.size);
        new Uint8Array(this._backup).set(new Uint8Array(this.buf));
    }
    restore() {
        const buffer = new ArrayBuffer(this.size);
        new Uint8Array(buffer).set(new Uint8Array(this._backup));
        this.buf = buffer;
        this.dv = new DataView(this.buf);
    }
    add(key, value) {
        const kind = this.type(key);
        if (kind !== 's32' && kind != 'f32')
            return false;
        if (!isFloat(value) || (kind == 's32' && !isInt(value)))
            return false;
        let current_value = this.get(key);
        return this.set(key, current_value + value);
    }
    set(key, value) {
        let index = undefined;
        let key0 = key;
        if (key.includes('[')) {
            let v = key.split("[");
            key = v[0];
            index = parseInt(v[1].replace("]", ""));
        }
        //console.log("SET", key, value)
        const hash = crc32(key);
        const off = this.off[hash];
        const kind = TYPES[hash];
        if (kind == "bool") {
            if (!isBoolean(value))
                return false;
            const v = (value === true) ? 1 : 0;
            this.dv.setUint32(off + 4, v, this.order);
        }
        else if (kind == "s32") {
            if (!isInt(value))
                return false;
            this.dv.setInt32(off + 4, value, this.order);
        }
        else if (kind == "f32") {
            if (!isFloat(value))
                return false;
            this.dv.setFloat32(off + 4, value, this.order);
        }
        else if (kind == "vector2f" || kind == "vector3f" || kind == "vector4f") {
            const n = this.hash_count(hash, off);
            let toff = off;
            if (index !== undefined) {
                if (!isFloat(value))
                    return false;
                this.dv.setFloat32(toff + 4 + 8 * index, value, this.order);
            }
            else {
                if ((kind == "vector2f" && !isVector2f(value)) ||
                    (kind == "vector3f" && !isVector3f(value)) ||
                    (kind == "vector4f" && !isVector4f(value)))
                    return false;
                for (let i = 0; i < n; i++) {
                    this.dv.setFloat32(toff + 4, value[i], this.order);
                    toff += 8;
                }
            }
        }
        else if (kind == "string" || kind == "string64" || kind == "string256") {
            const lens = { "string": 32, "string64": 64, "string265": 256 };
            let len = lens[kind];
            if (!isString(value))
                return false;
            if (this.write_string(hash, off, value, len) < 0)
                return false;
        }
        else if (kind == "s32_array") {
            let n = this.hash_count(hash, off);
            let toff = off;
            if (index !== undefined) {
                if (!isInt(value))
                    return false;
                this.dv.setInt32(toff + 4 + index * 8, value, this.order);
            }
            else {
                if (!isS32Array(value))
                    return false;
                for (let i = 0; i < n; i++) {
                    let v = (i < value.length) ? value[i] : 0.0;
                    this.dv.setInt32(toff + 4, v, this.order);
                    toff += 8;
                }
            }
        }
        else if (kind == "f32_array") {
            let n = this.hash_count(hash, off);
            let toff = off;
            if (index !== undefined) {
                if (!isFloat(value))
                    return false;
                this.dv.setFloat32(toff + 4 + index * 8, value, this.order);
            }
            else {
                if (!isF32Array(value))
                    return false;
                for (let i = 0; i < n; i++) {
                    let v = (i < value.length) ? value[i] : 0.0;
                    this.dv.setFloat32(toff + 4, v, this.order);
                    toff += 8;
                }
            }
        }
        else if (kind == "bool_array") {
            let n = this.hash_count(hash, off);
            if (index !== undefined) {
                if (!isBoolean(value)) {
                    return false;
                }
                let toff = off + index * 8;
                this.dv.setUint32(toff + 4, value, this.order);
            }
            else {
                if (!isBooleanArray(value))
                    return false;
                let toff = off;
                for (let i = 0; i < n; i++) {
                    let v = (i < value.length) ? ((value[i] != 0) ? 1 : 0) : 0;
                    this.dv.setUint32(toff + 4, v, this.order);
                    toff += 8;
                }
            }
        }
        else if (kind == "vector2f_array" || kind == "vector3f_array") {
            let m = (kind == "vector2f_array") ? 2 : 3;
            let n = this.hash_count(hash, off);
            if (key != key0) {
                let parts = parse_var(key0);
                if (parts.length == 0 || parts.length == 1) // parse error
                    return false;
                if (parts.length == 2) { // key[##] should be array of 2 or 3 values
                    if ((kind == "vector2f_array" && !isVector2f(value)) ||
                        (kind == "vector3f_array" && !isVector3f(value)))
                        return false;
                    if (parts[1] >= n)
                        return false;
                    let toff = off + 8 * m * parts[1];
                    for (let i = 0; i < m; i++) {
                        this.dv.setFloat32(toff + 4, value[i], this.order);
                        toff += 8;
                    }
                }
                if (parts.length == 3) { // key[##][##] should be a single value
                    if (!isFloat(value) || parts[1] >= n || parts[2] >= m)
                        return false;
                    let toff = off + 8 * m * parts[1] + 8 * parts[2];
                    this.dv.setFloat32(toff + 4, value, this.order);
                }
            }
            else {
                if ((kind == "vector2f_array" && !isVector2fArray(value)) ||
                    (kind == "vector3f_array" && !isVector3fArray(value))) {
                    return false;
                }
                let n = this.hash_count(hash, off);
                let toff = off;
                for (let i = 0; i < n / m; i++) {
                    for (let j = 0; j < m; j++) {
                        let v = (i < value.length && j < value[i].length) ? value[i][j] : 0.0;
                        this.dv.setFloat32(toff + 4, v, this.order);
                        toff += 8;
                    }
                }
            }
        }
        else if (kind == "string64_array" || "string_array" || kind == "string256_array") {
            const lens = { "string_array": 32, "string64_array": 64, "string265_array": 256 };
            let n = this.hash_count(hash, off);
            let len = lens[kind];
            let count = n / (len / 4);
            let toff = off;
            //console.log(`Setting ${key} ${index}:[${kind}] ${value}`)
            if (index !== undefined) {
                if (!isString(value))
                    return false;
                let toff = off + index * (len / 4) * 8;
                if (this.write_string(hash, toff, value, len) < 0)
                    return false;
            }
            else {
                if (!isStringArray(value))
                    return false;
                for (let i = 0; i < count; i++) {
                    let v = (i < value.length) ? value[i] : "";
                    toff = this.write_string(hash, toff, v, len);
                    if (toff < 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    is_key(key) {
        const hash = crc32(key);
        const off = this.off[hash];
        return off !== undefined;
    }
    get(key) {
        let index = undefined;
        if (key.includes('[')) {
            let v = key.split("[");
            key = v[0];
            index = parseInt(v[1].replace("]", ""));
        }
        const hash = crc32(key);
        const off = this.off[hash];
        if (!off) {
            console.error('offset is undefined', hash, hash.toString(16), key);
            return undefined;
        }
        //console.log("HASH: ", key, hash, off);
        const kind = TYPES[hash];
        if (!kind) {
            console.error("kind is undefined", key, hash, off, kind);
            return undefined;
        }
        //console.log("SAVE GET", key, kind);
        if (kind == "bool")
            return this.dv.getUint32(off + 4, this.order) != 0;
        if (kind == "s32")
            return this.dv.getInt32(off + 4, this.order);
        if (kind == "f32")
            return this.dv.getFloat32(off + 4, this.order);
        if (kind == "vector3f") {
            let out = [];
            let toff = off;
            while (toff + 4 < this.size && hash == this.dv.getUint32(toff, this.order)) {
                out.push(this.dv.getFloat32(toff + 4, this.order));
                toff += 8;
            }
            if (index !== undefined && index < out.length)
                return out[index];
            return out;
        }
        if (kind == "s32_array") {
            let out = [];
            let toff = off;
            while (toff + 4 < this.size && hash == this.dv.getUint32(toff, this.order)) {
                out.push(this.dv.getInt32(toff + 4, this.order));
                toff += 8;
            }
            if (index != undefined && index < out.length)
                return out[index];
            return out;
        }
        if (kind == "f32_array") {
            let out = [];
            let toff = off;
            while (toff + 4 < this.size && hash == this.dv.getUint32(toff, this.order)) {
                out.push(this.dv.getFloat32(toff + 4, this.order));
                toff += 8;
            }
            if (index != undefined && index < out.length)
                return out[index];
            return out;
        }
        if (kind == "bool_array") {
            let out = [];
            let toff = off;
            while (toff + 4 < this.size && hash == this.dv.getUint32(toff, this.order)) {
                out.push(this.dv.getUint32(toff + 4, this.order) != 0);
                toff += 8;
            }
            if (index != undefined && index < out.length)
                return out[index];
            return out;
        }
        if (kind == "vector2f_array" || kind == "vector3f_array") {
            const lens = { "vector2f_array": 2, "vector3f_array": 3 };
            const m = lens[kind];
            let out = [];
            let toff = off;
            while (toff + 4 < this.size && hash == this.dv.getUint32(toff, this.order)) {
                let tmp = [];
                for (let i = 0; i < m; i++) {
                    tmp.push(this.dv.getFloat32(toff + 4, this.order));
                    toff += 8;
                }
                out.push(tmp);
            }
            if (index != undefined && index < out.length)
                return out[index];
            return out;
        }
        if (kind == "string256" || kind == "string" || kind == "string64") {
            const lens = { "string256": 256, "string": 32, "string64": 64 };
            const n = lens[kind];
            return this.read_string(hash, off, n);
        }
        if (kind == "string256_array" || kind == "string_array" || kind == "string64_array") {
            const lens = {
                "string256_array": 256, "string_array": 32, "string64_array": 64
            };
            const n = lens[kind];
            let out = [];
            let s = "";
            let toff = off;
            while ((s = this.read_string(hash, toff, n)) != undefined) {
                out.push(s);
                toff += 8 * (n / 4);
            }
            if (index != undefined && index < out.length)
                return out[index];
            return out;
        }
        console.error("kind is unknown", key, hash, off, kind);
        return undefined;
    }
    read_string(hash, off, len = 32) {
        let out = "";
        let c = 0;
        let n = 0;
        if (this.dv.getUint32(off, this.order) != hash)
            return undefined;
        while (off + 4 < this.size && hash == this.dv.getUint32(off, this.order) && n < len) {
            for (let i = 0; i < 4; i++) {
                if ((c = this.dv.getUint8(off + 4 + i)) != 0)
                    out += String.fromCharCode(c);
            }
            off += 8;
            n += 4;
        }
        return out;
    }
    write_string(hash, off, value, len = 32) {
        let n = 0;
        if (this.dv.getUint32(off, this.order) != hash)
            return -2;
        while (off + 4 < this.size && hash == this.dv.getUint32(off, this.order) && n < len) {
            for (let i = 0; i < 4; i++) {
                const c = (n + i < value.length) ? value.charCodeAt(n + i) : 0;
                this.dv.setUint8(off + 4 + i, c);
            }
            off += 8;
            n += 4;
        }
        if (n != len)
            return -1;
        return off;
    }
    hash_count(hash, off) {
        let n = 0;
        while (hash == this.dv.getUint32(off, this.order)) {
            n += 1;
            off += 8;
        }
        return n;
    }
    pouch_items() {
        const items = this.get("PorchItem");
        const values = this.get("PorchItem_Value1");
        const equip = this.get("PorchItem_EquipFlag");
        const sword_flag_sp = this.get("PorchSword_FlagSp");
        const bow_flag_sp = this.get("PorchBow_FlagSp");
        const shield_flag_sp = this.get("PorchShield_FlagSp");
        const sword_value_sp = this.get("PorchSword_ValueSp");
        const bow_value_sp = this.get("PorchBow_ValueSp");
        const shield_value_sp = this.get("PorchShield_ValueSp");
        const cook_effect0 = this.get("CookEffect0");
        const cook_effect1 = this.get("CookEffect1");
        const stamina_recover = this.get("StaminaRecover");
        return arrays_to_porch(items, values, equip, sword_flag_sp, bow_flag_sp, shield_flag_sp, sword_value_sp, bow_value_sp, shield_value_sp, cook_effect0, cook_effect1, stamina_recover);
    }
    set_pouch_items(items) {
        const z = porch_to_arrays(items);
        //console.log(z)
        return this.set("PorchItem", z.names) &&
            this.set("PorchItem_Value1", z.value) &&
            this.set("PorchItem_EquipFlag", z.equip) &&
            this.set("PorchSword_FlagSp", z.sword_flag_sp) &&
            this.set("PorchBow_FlagSp", z.bow_flag_sp) &&
            this.set("PorchShield_FlagSp", z.shield_flag_sp) &&
            this.set("PorchSword_ValueSp", z.sword_value_sp) &&
            this.set("PorchBow_ValueSp", z.bow_value_sp) &&
            this.set("PorchShield_ValueSp", z.shield_value_sp) &&
            this.set("CookEffect0", z.cook_effect0) &&
            this.set("CookEffect1", z.cook_effect1) &&
            this.set("StaminaRecover", z.stamina_recover);
    }
}
function makeCRCTable() {
    let c;
    let crcTable = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}
let crcTable = [];
function crc32(str) {
    if (crcTable.length == 0)
        crcTable = makeCRCTable();
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}
;
function value_to_time(value) {
    let minutes_per_value = 24 * 60 / 360;
    let minutes_full = value * minutes_per_value; // Minutes of day
    let days = Math.floor(minutes_full / (24 * 60));
    minutes_full = minutes_full - days * 24 * 60;
    let hours = Math.floor(minutes_full / 60);
    let minutes = minutes_full % 60;
    let hours_s = hours.toFixed(0).padStart(2, '0');
    let minutes_s = minutes.toFixed(0).padStart(2, '0');
    if (days > 0) {
        return `${days} d ${hours_s}:${minutes_s}`;
    }
    return `${hours_s}:${minutes_s}`;
}
function time_to_value(time) {
    let parts = time.split(" ");
    let days = 0;
    let hm = [];
    if (parts.length == 3) {
        days = parseInt(parts[0]);
        hm = parts[2].split(':');
    }
    else if (parts.length == 1) {
        hm = parts[0].split(':');
    }
    let hours = parseInt(hm[0]);
    let minutes = parseInt(hm[1]);
    let minutes_full = days * 24 * 60 + hours * 60 + minutes;
    let minutes_per_value = 24 * 60 / 360;
    let value = minutes_full / minutes_per_value;
    return value;
}
function modify_savefile(s, data, alias) {
    //let s = new Savefile()
    //let buf = await read_file(StartGameDataUrl);
    //s.read(buf);
    const alias_mod = Object.assign(alias, {
        "CurrentHeart": "CurrentHart",
        "MaxHeartValue": "MaxHartValue",
    });
    set_from_data(s, data, alias_mod);
    //return s;
}
function conv(key, value) {
    const converters = {
        "WM_Time": time_to_value,
        "WM_BloodyMoonTimer": time_to_value,
    };
    if (key in converters) {
        return converters[key](value);
    }
    return value;
}
function set_from_data(s, data, alias) {
    for (const key of Object.keys(data)) {
        //console.log(key)
        let value = data[key];
        const k = (key in alias) ? alias[key] : key;
        //console.log(`${key}: ${k} `)
        if (typeof k === 'object') {
            set_from_data(s, k, alias);
            continue;
        }
        //console.log(`==> ${k}: ${value}`)
        //const v = JSON.parse(value);
        let ret = s.set(k, conv(k, value));
        if (!ret)
            console.error(`error setting ${k}: ${value}`);
    }
}
function save_diff(a, b) {
    let av = new Uint32Array(a.buf);
    let bv = new Uint32Array(b.buf);
    for (let i = 0; i < a.size / 4; i++) {
        if (av[i] != bv[i]) {
            //console.log(i, av[i], bv[i])
        }
    }
}
function location_ui(value) {
    if (value in location)
        return location[value]
    let tmp = value.replace("Location_", "")
    if (tmp in location)
        return location[tmp]
    return value
}

function toArrayBuffer(buffer) {
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    return arrayBuffer;
}
function time(timeVal){
    var seconds=timeVal%60;
    if(seconds<10)seconds='0'+seconds;
    var minutes=parseInt(timeVal/60)%60;
    if(minutes<10)seconds='0'+seconds;
    return parseInt(timeVal/3600)+':'+minutes+':'+seconds;
}

exports.toArrayBuffer = toArrayBuffer;
exports.load_types = load_types;
exports.Savefile = Savefile;
exports.time = time;
exports.location_ui = location_ui;

