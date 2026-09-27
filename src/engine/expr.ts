export type BinaryOp = "+" | "-" | "*" | "/" | "^";
export type FnName = "log10" | "ln" | "log" | "max" | "min" | "sqrt" | "ge" | "lt" | "if" | "floor" | "abs";

export type Expr =
  | { t: "num"; v: number }
  | { t: "ref"; id: string }
  | { t: "bin"; op: BinaryOp; a: Expr; b: Expr }
  | { t: "neg"; a: Expr }
  | { t: "fn"; fn: FnName; args: Expr[] };

const FN_ARITY: Record<FnName, number> = {
  log10: 1,
  ln: 1,
  log: 2,
  max: 2,
  min: 2,
  sqrt: 1,
  ge: 2,
  lt: 2,
  if: 3,
  floor: 1,
  abs: 1,
};

export const num = (v: number): Expr => ({ t: "num", v });
export const ref = (id: string): Expr => ({ t: "ref", id });
export const bin = (op: BinaryOp, a: Expr, b: Expr): Expr => ({ t: "bin", op, a, b });
export const mul = (...xs: Expr[]): Expr => xs.reduce((acc, x) => bin("*", acc, x));
export const add = (...xs: Expr[]): Expr => xs.reduce((acc, x) => bin("+", acc, x));
export const pow = (a: Expr, b: Expr | number): Expr => bin("^", a, typeof b === "number" ? num(b) : b);
export const call = (fn: FnName, ...args: Expr[]): Expr => {
  if (args.length !== FN_ARITY[fn]) throw new Error(`${fn} expects ${FN_ARITY[fn]} arguments`);
  return { t: "fn", fn, args };
};

export type Bindings = Record<string, string | Expr>;

/**
 * Parses an infix formula. Identifiers containing a dot are stat ids; other
 * identifiers must be provided in `bindings` (mapping to a stat id or an Expr),
 * which keeps encoded formulas close to the wiki's single-letter notation.
 */
export function f(source: string, bindings: Bindings = {}): Expr {
  return new Parser(source, bindings).parse();
}

class Parser {
  private tokens: string[];
  private i = 0;

  constructor(
    private readonly source: string,
    private readonly bindings: Bindings,
  ) {
    this.tokens = source.match(/\d+(?:\.\d+)?(?:e[+-]?\d+)?|[A-Za-z_][\w.]*|[-+*/^(),]/g) ?? [];
    const rebuilt = this.tokens.join("");
    if (rebuilt !== source.replace(/\s+/g, "")) throw new Error(`Unexpected characters in formula: ${source}`);
  }

  parse(): Expr {
    const e = this.expr();
    if (this.i !== this.tokens.length) throw this.error("trailing tokens");
    return e;
  }

  private error(msg: string) {
    return new Error(`${msg} at token ${this.i} ("${this.tokens[this.i] ?? "end"}") in formula: ${this.source}`);
  }

  private peek() {
    return this.tokens[this.i];
  }

  private next() {
    return this.tokens[this.i++];
  }

  private expect(tok: string) {
    if (this.next() !== tok) throw this.error(`expected ${tok}`);
  }

  private expr(): Expr {
    let left = this.term();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.next() as BinaryOp;
      left = bin(op, left, this.term());
    }
    return left;
  }

  private term(): Expr {
    let left = this.unary();
    while (this.peek() === "*" || this.peek() === "/") {
      const op = this.next() as BinaryOp;
      left = bin(op, left, this.unary());
    }
    return left;
  }

  private unary(): Expr {
    if (this.peek() === "-") {
      this.next();
      return { t: "neg", a: this.unary() };
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.atom();
    if (this.peek() === "^") {
      this.next();
      return bin("^", base, this.unary());
    }
    return base;
  }

  private atom(): Expr {
    const tok = this.next();
    if (tok === undefined) throw this.error("unexpected end");
    if (tok === "(") {
      const e = this.expr();
      this.expect(")");
      return e;
    }
    if (/^\d/.test(tok)) return num(Number(tok));
    if (/^[A-Za-z_]/.test(tok)) {
      if (this.peek() === "(") {
        if (!(tok in FN_ARITY)) throw this.error(`unknown function ${tok}`);
        this.next();
        const args: Expr[] = [];
        if (this.peek() !== ")") {
          args.push(this.expr());
          while (this.peek() === ",") {
            this.next();
            args.push(this.expr());
          }
        }
        this.expect(")");
        const fn = tok as FnName;
        if (args.length !== FN_ARITY[fn]) throw this.error(`${fn} expects ${FN_ARITY[fn]} arguments`);
        return { t: "fn", fn, args };
      }
      if (tok in this.bindings) {
        const b = this.bindings[tok];
        return typeof b === "string" ? ref(b) : b;
      }
      if (tok.includes(".")) return ref(tok);
      throw this.error(`unbound identifier ${tok}`);
    }
    throw this.error("unexpected token");
  }
}

export function refsOf(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.t) {
    case "ref":
      out.add(e.id);
      break;
    case "bin":
      refsOf(e.a, out);
      refsOf(e.b, out);
      break;
    case "neg":
      refsOf(e.a, out);
      break;
    case "fn":
      e.args.forEach((a) => refsOf(a, out));
      break;
  }
  return out;
}

export function toInfix(e: Expr): string {
  switch (e.t) {
    case "num":
      return String(e.v);
    case "ref":
      return e.id;
    case "neg":
      return `-(${toInfix(e.a)})`;
    case "bin":
      return `(${toInfix(e.a)} ${e.op} ${toInfix(e.b)})`;
    case "fn":
      return `${e.fn}(${e.args.map(toInfix).join(", ")})`;
  }
}

/** Postfix rendering, in the same notation the WikiWizard BiS bot prints its formulas. */
export function toPostfix(e: Expr): string {
  switch (e.t) {
    case "num":
      return String(e.v);
    case "ref":
      return e.id;
    case "neg":
      return `${toPostfix(e.a)} neg`;
    case "bin":
      return `${toPostfix(e.a)} ${toPostfix(e.b)} ${e.op}`;
    case "fn":
      return `${e.args.map(toPostfix).join(" ")} ${e.fn}`;
  }
}
