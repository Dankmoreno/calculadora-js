/**
 * Motor de expresiones: tokeniza, analiza y evalúa una expresión completa,
 * con precedencia de operadores y paréntesis. Sin DOM y sin estado global.
 *
 * Gramática (de menor a mayor prioridad):
 *   expresion := termino (('+' | '-') termino)*
 *   termino   := unario (('×' | '÷') unario | implícita)*
 *   unario    := ('-' | '+') unario | potencia
 *   potencia  := postfijo ('^' unario)?          // asociativa por la derecha
 *   postfijo  := primario ('!' | '²' | '³' | '⁻¹' | '%')*
 *   primario  := número | constante | variable | función '(' expresion ')'
 *              | '(' expresion ')' | ('√' | '∛') postfijo
 */
(function (global) {
  "use strict";

  class ErrorCalculo extends Error {
    constructor(tipo, posicion) {
      super(tipo + " ERROR");
      this.tipo = tipo;          // "Syntax" | "Math"
      this.posicion = posicion;
    }
  }

  // El orden importa: los literales largos deben probarse antes que los cortos
  // (sin⁻¹( antes que sin(, Ans antes que A).
  const FUNCIONES = ["sin⁻¹(", "cos⁻¹(", "tan⁻¹(", "sin(", "cos(", "tan(", "ln(", "log(", "abs("];
  const PREFIJOS = ["√", "∛"];
  const POSTFIJOS = ["⁻¹", "²", "³", "!", "%"];
  const VARIABLES = ["Ans", "A", "B", "C", "D", "M"];
  const CONSTANTES = ["π", "e"];

  const CLASE = new Map();
  FUNCIONES.forEach((l) => CLASE.set(l, "fn"));
  PREFIJOS.forEach((l) => CLASE.set(l, "pre"));
  POSTFIJOS.forEach((l) => CLASE.set(l, "post"));
  VARIABLES.forEach((l) => CLASE.set(l, "var"));
  CONSTANTES.forEach((l) => CLASE.set(l, "const"));
  const LITERALES = [...FUNCIONES, ...POSTFIJOS, ...VARIABLES, ...CONSTANTES, ...PREFIJOS];

  const OPERADORES = ["+", "-", "×", "÷", "^"];

  // ---------------------------------------------------------------- tokenizar

  function tokenizar(texto) {
    const tokens = [];
    let i = 0;

    while (i < texto.length) {
      const c = texto[i];

      if (c === " ") { i++; continue; }

      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < texto.length && /[0-9.]/.test(texto[j])) j++;
        let crudo = texto.slice(i, j);

        // Notación de exponente de la tecla EXP: 1E5, 2E-3.
        if (texto[j] === "E") {
          let k = j + 1;
          if (texto[k] === "-") k++;
          if (/[0-9]/.test(texto[k] || "")) {
            while (k < texto.length && /[0-9]/.test(texto[k])) k++;
            crudo += texto.slice(j, k);
            j = k;
          }
        }

        if ((crudo.match(/\./g) || []).length > 1) throw new ErrorCalculo("Syntax", i);
        const valor = Number(crudo);
        if (!isFinite(valor)) throw new ErrorCalculo("Syntax", i);
        tokens.push({ t: "num", v: valor, i });
        i = j;
        continue;
      }

      const literal = LITERALES.find((lit) => texto.startsWith(lit, i));
      if (literal) {
        tokens.push({ t: CLASE.get(literal), v: literal, i });
        i += literal.length;
        continue;
      }

      if (OPERADORES.includes(c)) { tokens.push({ t: "op", v: c, i }); i++; continue; }
      if (c === "(") { tokens.push({ t: "abre", v: c, i }); i++; continue; }
      if (c === ")") { tokens.push({ t: "cierra", v: c, i }); i++; continue; }

      throw new ErrorCalculo("Syntax", i);
    }

    return tokens;
  }

  // ------------------------------------------------------------------ analizar

  function analizar(tokens, largo) {
    let p = 0;
    const mirar = () => tokens[p];
    const siguiente = () => tokens[p++];
    const finalizado = () => p >= tokens.length;

    function expresion() {
      let nodo = termino();
      let s = mirar();
      while (s && s.t === "op" && (s.v === "+" || s.v === "-")) {
        siguiente();
        nodo = { t: "bin", op: s.v, a: nodo, b: termino() };
        s = mirar();
      }
      return nodo;
    }

    function termino() {
      let nodo = unario();
      for (;;) {
        const s = mirar();
        if (!s) break;

        if (s.t === "op" && (s.v === "×" || s.v === "÷")) {
          siguiente();
          nodo = { t: "bin", op: s.v, a: nodo, b: unario() };
          continue;
        }

        // Multiplicación implícita al estilo Casio: 2π, 3(4+5), 2sin(30), 2√9.
        // No se aplica entre dos números seguidos, que no es escribible.
        if (["abre", "fn", "pre", "var", "const"].includes(s.t)) {
          nodo = { t: "bin", op: "×", a: nodo, b: unario() };
          continue;
        }

        break;
      }
      return nodo;
    }

    function unario() {
      const s = mirar();
      if (s && s.t === "op" && (s.v === "-" || s.v === "+")) {
        siguiente();
        const dentro = unario();
        return s.v === "-" ? { t: "neg", a: dentro } : dentro;
      }
      return potencia();
    }

    function potencia() {
      const base = postfijo();
      const s = mirar();
      if (s && s.t === "op" && s.v === "^") {
        siguiente();
        return { t: "bin", op: "^", a: base, b: unario() };
      }
      return base;
    }

    function postfijo() {
      let nodo = primario();
      for (;;) {
        const s = mirar();
        if (!s || s.t !== "post") break;
        siguiente();
        nodo = { t: "post", op: s.v, a: nodo };
      }
      return nodo;
    }

    // Una fx cierra sola los paréntesis que falten al pulsar =.
    function cerrar() {
      const s = mirar();
      if (s && s.t === "cierra") { siguiente(); return; }
      if (finalizado()) return;
      throw new ErrorCalculo("Syntax", s.i);
    }

    function primario() {
      const s = mirar();
      if (!s) throw new ErrorCalculo("Syntax", largo);

      switch (s.t) {
        case "num":   siguiente(); return { t: "num", v: s.v };
        case "const": siguiente(); return { t: "const", v: s.v };
        case "var":   siguiente(); return { t: "var", v: s.v };
        // El operando llega hasta unario, no hasta postfijo, para admitir el
        // signo (∛-8 = -2). Sigue sin consumir × ni ÷, así que √9×2 = 6.
        case "pre":   siguiente(); return { t: "pre", op: s.v, a: unario() };
        case "fn": {
          siguiente();
          const dentro = expresion();
          cerrar();
          return { t: "fn", nombre: s.v, a: dentro };
        }
        case "abre": {
          siguiente();
          const dentro = expresion();
          cerrar();
          return dentro;
        }
        default:
          throw new ErrorCalculo("Syntax", s.i);
      }
    }

    const raiz = expresion();
    if (!finalizado()) throw new ErrorCalculo("Syntax", mirar().i);
    return raiz;
  }

  // ------------------------------------------------------------------ evaluar

  const VUELTA = { DEG: 360, RAD: 2 * Math.PI, GRA: 400 };

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) throw new ErrorCalculo("Math");
    if (n > 170) throw new ErrorCalculo("Math");  // 171! ya no cabe en un double
    let r = 1;
    for (let k = 2; k <= n; k++) r *= k;
    return r;
  }

  function evaluar(nodo, ctx) {
    const aRadianes = (x) => (x * 2 * Math.PI) / VUELTA[ctx.angulo];
    const desdeRadianes = (x) => (x * VUELTA[ctx.angulo]) / (2 * Math.PI);

    // En grados y gradianes los ángulos notables dejan ruido de coma flotante
    // (sen 180° = 1,22e-16). En radianes no se toca: ahí un valor diminuto
    // puede ser el resultado real.
    const sinRuido = (x) => (ctx.angulo !== "RAD" && Math.abs(x) < 1e-12 ? 0 : x);

    switch (nodo.t) {
      case "num":
        return nodo.v;

      case "const":
        return nodo.v === "π" ? Math.PI : Math.E;

      case "var": {
        const v = ctx.variables[nodo.v];
        return typeof v === "number" ? v : 0;
      }

      case "neg":
        return -evaluar(nodo.a, ctx);

      case "bin": {
        // Porcentaje relativo: 100 + 10% = 110, 200 − 25% = 150.
        if ((nodo.op === "+" || nodo.op === "-") && nodo.b.t === "post" && nodo.b.op === "%") {
          const base = evaluar(nodo.a, ctx);
          const parte = (base * evaluar(nodo.b.a, ctx)) / 100;
          return nodo.op === "+" ? base + parte : base - parte;
        }

        const a = evaluar(nodo.a, ctx);
        const b = evaluar(nodo.b, ctx);
        switch (nodo.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "×": return a * b;
          case "÷":
            if (b === 0) throw new ErrorCalculo("Math");
            return a / b;
          case "^": {
            const r = Math.pow(a, b);
            if (Number.isNaN(r)) throw new ErrorCalculo("Math");
            return r;
          }
          default: throw new ErrorCalculo("Syntax");
        }
      }

      case "pre": {
        const x = evaluar(nodo.a, ctx);
        if (nodo.op === "√") {
          if (x < 0) throw new ErrorCalculo("Math");
          return Math.sqrt(x);
        }
        return Math.cbrt(x);
      }

      case "post": {
        const x = evaluar(nodo.a, ctx);
        switch (nodo.op) {
          case "!": return factorial(x);
          case "²": return x * x;
          case "³": return x * x * x;
          case "⁻¹":
            if (x === 0) throw new ErrorCalculo("Math");
            return 1 / x;
          case "%": return x / 100;
          default: throw new ErrorCalculo("Syntax");
        }
      }

      case "fn": {
        const x = evaluar(nodo.a, ctx);
        switch (nodo.nombre) {
          case "sin(": return sinRuido(Math.sin(aRadianes(x)));
          case "cos(": return sinRuido(Math.cos(aRadianes(x)));
          case "tan(": {
            // tan tiene asíntota en 90° + k·180°.
            const cuarto = VUELTA[ctx.angulo] / 4;
            if (Math.abs((Math.abs(x) - cuarto) % (2 * cuarto)) < 1e-12) {
              throw new ErrorCalculo("Math");
            }
            return sinRuido(Math.tan(aRadianes(x)));
          }
          case "sin⁻¹(":
            if (x < -1 || x > 1) throw new ErrorCalculo("Math");
            return desdeRadianes(Math.asin(x));
          case "cos⁻¹(":
            if (x < -1 || x > 1) throw new ErrorCalculo("Math");
            return desdeRadianes(Math.acos(x));
          case "tan⁻¹(":
            return desdeRadianes(Math.atan(x));
          case "ln(":
            if (x <= 0) throw new ErrorCalculo("Math");
            return Math.log(x);
          case "log(":
            if (x <= 0) throw new ErrorCalculo("Math");
            return Math.log10(x);
          case "abs(":
            return Math.abs(x);
          default:
            throw new ErrorCalculo("Syntax");
        }
      }

      default:
        throw new ErrorCalculo("Syntax");
    }
  }

  /**
   * Evalúa una expresión. Devuelve un número o lanza ErrorCalculo.
   * ctx: { angulo: "DEG"|"RAD"|"GRA", variables: { Ans, A, B, C, D, M } }
   */
  function calcular(texto, ctx) {
    const limpio = String(texto).trim();
    if (limpio === "") throw new ErrorCalculo("Syntax", 0);

    const arbol = analizar(tokenizar(limpio), limpio.length);
    const valor = evaluar(arbol, {
      angulo: (ctx && ctx.angulo) || "DEG",
      variables: (ctx && ctx.variables) || {},
    });

    if (!isFinite(valor)) throw new ErrorCalculo("Math");
    return valor;
  }

  global.Expresion = { calcular, ErrorCalculo, tokenizar, FUNCIONES, PREFIJOS, POSTFIJOS };
})(typeof window !== "undefined" ? window : globalThis);
