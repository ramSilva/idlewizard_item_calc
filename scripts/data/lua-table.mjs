/**
 * Parses the data-only subset of Lua used by the wiki's Module:Data/* pages:
 * top-level assignments like `items["X"] = { ... }` whose values are tables,
 * strings, numbers and booleans. Function definitions are not supported.
 */
export function parseLuaAssignments(source) {
  const lexer = new Lexer(source);
  const assignments = [];
  while (!lexer.eof()) {
    if (lexer.acceptWord("local")) {
      const name = lexer.identifier();
      const value = lexer.accept("=") ? lexer.value() : undefined;
      if (value !== undefined) lexer.assign([name], value);
      continue;
    }
    if (lexer.acceptWord("return")) {
      lexer.value();
      continue;
    }
    const target = [lexer.identifier()];
    for (;;) {
      if (lexer.accept(".")) target.push(lexer.identifier());
      else if (lexer.accept("[")) {
        target.push(lexer.value());
        lexer.expect("]");
      } else break;
    }
    lexer.expect("=");
    const value = lexer.value();
    lexer.assign(target, value);
    assignments.push({ target, value });
  }
  return assignments;
}

/** Groups `table[key] = value` assignments by table name. */
export function collectTables(source) {
  const tables = {};
  for (const { target, value } of parseLuaAssignments(source)) {
    if (target.length !== 2 || value === undefined) continue;
    const [table, key] = target;
    (tables[table] ??= {})[key] = value;
  }
  return tables;
}

class Lexer {
  constructor(src) {
    this.src = src;
    this.pos = 0;
    this.env = {};
  }

  assign(target, value) {
    let scope = this.env;
    for (const key of target.slice(0, -1)) scope = scope[key] ??= {};
    scope[target.at(-1)] = value;
  }

  skip() {
    for (;;) {
      const rest = this.src.slice(this.pos, this.pos + 4);
      if (/^\s/.test(rest)) this.pos++;
      else if (rest.startsWith("--[")) {
        const m = /^--\[(=*)\[/.exec(this.src.slice(this.pos));
        if (m) {
          const end = this.src.indexOf(`]${m[1]}]`, this.pos);
          this.pos = end === -1 ? this.src.length : end + m[1].length + 2;
        } else this.skipLine();
      } else if (rest.startsWith("--")) this.skipLine();
      else return;
    }
  }

  skipLine() {
    const nl = this.src.indexOf("\n", this.pos);
    this.pos = nl === -1 ? this.src.length : nl + 1;
  }

  eof() {
    this.skip();
    return this.pos >= this.src.length;
  }

  peek(s) {
    this.skip();
    return this.src.startsWith(s, this.pos);
  }

  accept(s) {
    if (this.peek(s)) {
      this.pos += s.length;
      return true;
    }
    return false;
  }

  acceptWord(word) {
    this.skip();
    const re = new RegExp(`^${word}\\b`);
    if (re.test(this.src.slice(this.pos, this.pos + word.length + 1))) {
      this.pos += word.length;
      return true;
    }
    return false;
  }

  expect(s) {
    if (!this.accept(s)) throw this.error(`expected "${s}"`);
  }

  error(msg) {
    const line = this.src.slice(0, this.pos).split("\n").length;
    return new Error(`Lua parse error at line ${line}: ${msg} near ${JSON.stringify(this.src.slice(this.pos, this.pos + 40))}`);
  }

  identifier() {
    this.skip();
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.src.slice(this.pos, this.pos + 200));
    if (!m) throw this.error("expected identifier");
    this.pos += m[0].length;
    return m[0];
  }

  term() {
    this.skip();
    const c = this.src[this.pos];
    if (c === "{") return this.table();
    if (c === '"' || c === "'") return this.quoted(c);
    if (c === "[" && /^\[=*\[/.test(this.src.slice(this.pos, this.pos + 10))) return this.longString();
    const m = /^-?(?:0x[0-9a-fA-F]+|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+)/.exec(this.src.slice(this.pos, this.pos + 64));
    if (m) {
      this.pos += m[0].length;
      return Number(m[0]);
    }
    if (this.acceptWord("true")) return true;
    if (this.acceptWord("false")) return false;
    if (this.acceptWord("nil")) return null;
    const ident = this.identifier();
    if (ident === "False") return false;
    const path = [ident];
    while (this.peek(".") && !this.peek("..")) {
      this.pos++;
      path.push(this.identifier());
    }
    return this.resolve(path);
  }

  resolve(path) {
    let v = this.env;
    for (const key of path) v = v?.[key];
    return v === undefined ? { $ref: path.join(".") } : v;
  }

  value() {
    let v = this.term();
    while (this.accept("..")) v = `${v}${this.term()}`;
    return v;
  }

  quoted(q) {
    this.pos++;
    let out = "";
    while (this.pos < this.src.length) {
      const c = this.src[this.pos++];
      if (c === q) return out;
      if (c === "\\") {
        const n = this.src[this.pos++];
        out += { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'", "\\": "\\" }[n] ?? n;
      } else out += c;
    }
    throw this.error("unterminated string");
  }

  longString() {
    const m = /^\[(=*)\[/.exec(this.src.slice(this.pos));
    const close = `]${m[1]}]`;
    const start = this.pos + m[0].length;
    const end = this.src.indexOf(close, start);
    if (end === -1) throw this.error("unterminated long string");
    this.pos = end + close.length;
    return this.src.slice(start, end).replace(/^\n/, "");
  }

  table() {
    this.expect("{");
    const array = [];
    const hash = {};
    let hasHash = false;
    while (!this.accept("}")) {
      if (this.accept("[")) {
        const key = this.value();
        this.expect("]");
        this.expect("=");
        hash[key] = this.value();
        hasHash = true;
      } else {
        const save = this.pos;
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/.exec(this.src.slice(this.pos, this.pos + 200));
        if (m) {
          this.pos += m[0].length;
          hash[m[1]] = this.value();
          hasHash = true;
        } else {
          this.pos = save;
          array.push(this.value());
        }
      }
      if (!this.accept(",")) this.accept(";");
    }
    if (!hasHash) return array;
    array.forEach((v, i) => (hash[i + 1] = v));
    return hash;
  }
}
