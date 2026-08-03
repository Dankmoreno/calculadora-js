/**
 * Controlador al estilo de una calculadora científica fx: mantiene la línea de
 * entrada con su cursor, el modo angular, las variables, la memoria y el
 * historial. No toca el DOM; delega todo el cálculo en Expresion.
 */
(function (global) {
  "use strict";

  const LARGO_MAXIMO = 120;
  const LIMITE_HISTORIAL = 30;
  const MODOS = ["DEG", "RAD", "GRA"];

  const SUPERINDICES = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴",
                         5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  const aSuperindice = (n) => String(n).split("").map((c) => SUPERINDICES[c] || c).join("");
  const conComa = (texto) => texto.replace(/\./g, ",");

  /**
   * Formato de una fx: hasta 10 cifras significativas, y notación científica
   * fuera del rango representable en pantalla.
   */
  function formatear(x) {
    if (!isFinite(x)) return "Math ERROR";

    // toPrecision(12) absorbe el ruido de coma flotante antes de recortar a las
    // 10 cifras que muestra el visor, sin aplastar los números muy pequeños.
    const limpio = parseFloat(x.toPrecision(12));
    if (limpio === 0) return "0";

    const magnitud = Math.abs(limpio);
    if (magnitud >= 1e10 || magnitud < 1e-9) {
      let exponente = Math.floor(Math.log10(magnitud));
      let mantisa = parseFloat((limpio / Math.pow(10, exponente)).toPrecision(10));
      if (Math.abs(mantisa) >= 10) { mantisa /= 10; exponente += 1; }
      return `${conComa(String(mantisa))}×10${aSuperindice(exponente)}`;
    }

    return conComa(String(parseFloat(limpio.toPrecision(10))));
  }

  // Un texto que continúa el cálculo anterior en lugar de empezar uno nuevo.
  const CONTINUA = /^[+\-×÷^]|^[²³!%]|^⁻¹/;

  function crear() {
    let entrada = "";
    let cursor = 0;
    let resultado = "";
    let error = "";
    let posicionError = -1;
    let congelado = false;      // se acaba de pulsar =: lo siguiente empieza de nuevo
    let shift = false;
    let angulo = "DEG";
    let esperando = null;       // "STO" | "RCL" mientras se elige la variable
    let indiceHistorial = -1;

    const variables = { Ans: 0, A: 0, B: 0, C: 0, D: 0, M: 0 };
    let historial = [];

    function reiniciarEdicion() {
      entrada = "";
      cursor = 0;
      error = "";
      posicionError = -1;
    }

    function insertar(texto) {
      if (esperando) { esperando = null; }

      if (congelado) {
        // Un operador encadena con el resultado anterior; cualquier otra cosa
        // empieza una expresión nueva. Es el comportamiento de una fx.
        if (CONTINUA.test(texto)) {
          entrada = "Ans";
          cursor = 3;
        } else {
          entrada = "";
          cursor = 0;
        }
        congelado = false;
        resultado = "";
      }

      if (error) { error = ""; posicionError = -1; }
      if (entrada.length + texto.length > LARGO_MAXIMO) return;

      entrada = entrada.slice(0, cursor) + texto + entrada.slice(cursor);
      cursor += texto.length;
      indiceHistorial = -1;
    }

    function borrar() {
      esperando = null;
      if (congelado) { congelado = false; resultado = ""; }
      if (error) { error = ""; posicionError = -1; }
      if (cursor === 0) return;

      // Borra el token completo que hay antes del cursor, no solo un carácter:
      // "sin(" se va de una vez, como en una fx.
      const antes = entrada.slice(0, cursor);
      const token = [...global.Expresion.FUNCIONES, "⁻¹", "Ans"]
        .filter((t) => antes.endsWith(t))
        .sort((a, b) => b.length - a.length)[0];
      const paso = token ? token.length : 1;

      entrada = entrada.slice(0, cursor - paso) + entrada.slice(cursor);
      cursor -= paso;
    }

    function limpiarTodo() {
      reiniciarEdicion();
      resultado = "";
      congelado = false;
      esperando = null;
      shift = false;
      indiceHistorial = -1;
    }

    function mover(delta) {
      esperando = null;
      if (congelado) { congelado = false; }
      cursor = Math.max(0, Math.min(entrada.length, cursor + delta));
    }

    function contexto() {
      return { angulo, variables };
    }

    // Evalúa la línea actual sin tocar el estado. Devuelve {ok, valor} o {ok:false}.
    function intentar(texto) {
      try {
        return { ok: true, valor: global.Expresion.calcular(texto, contexto()) };
      } catch (e) {
        return { ok: false, error: e };
      }
    }

    function igual() {
      esperando = null;
      shift = false;
      if (entrada.trim() === "") return;

      const intento = intentar(entrada);
      if (!intento.ok) {
        error = intento.error.tipo === "Math" ? "Math ERROR" : "Syntax ERROR";
        posicionError = typeof intento.error.posicion === "number" ? intento.error.posicion : -1;
        resultado = "";
        // Una fx deja la expresión para poder corregirla, con el cursor en el fallo.
        if (posicionError >= 0) cursor = Math.min(posicionError, entrada.length);
        congelado = false;
        return;
      }

      variables.Ans = intento.valor;
      resultado = formatear(intento.valor);
      error = "";
      posicionError = -1;
      congelado = true;

      historial.unshift({ expresion: conComa(entrada), resultado });
      if (historial.length > LIMITE_HISTORIAL) historial.pop();
      indiceHistorial = -1;
    }

    function alternarAngulo() {
      angulo = MODOS[(MODOS.indexOf(angulo) + 1) % MODOS.length];
    }

    function alternarShift() {
      shift = !shift;
    }

    function pedirVariable(que) {
      esperando = que;
    }

    // Completa un STO/RCL pendiente. Devuelve true si consumió la pulsación.
    function elegirVariable(nombre) {
      if (!esperando) return false;
      const que = esperando;
      esperando = null;

      if (!(nombre in variables) || nombre === "Ans") return true;

      if (que === "RCL") {
        insertar(nombre);
        return true;
      }

      const fuente = congelado || entrada.trim() === ""
        ? { ok: true, valor: variables.Ans }
        : intentar(entrada);

      if (!fuente.ok) {
        error = "Syntax ERROR";
        resultado = "";
        return true;
      }

      variables[nombre] = fuente.valor;
      resultado = formatear(fuente.valor);
      congelado = true;
      return true;
    }

    function memoria(operacion) {
      esperando = null;
      if (operacion === "limpiar") { variables.M = 0; return; }
      if (operacion === "recuperar") { insertar("M"); return; }

      const base = congelado || entrada.trim() === "" ? { ok: true, valor: variables.Ans } : intentar(entrada);
      if (!base.ok) { error = "Syntax ERROR"; resultado = ""; return; }

      variables.M += operacion === "restar" ? -base.valor : base.valor;
      resultado = formatear(variables.M);
      congelado = true;
    }

    function recorrerHistorial(delta) {
      if (historial.length === 0) return;
      esperando = null;

      const siguiente = indiceHistorial + delta;
      if (siguiente < 0) { indiceHistorial = -1; return; }
      if (siguiente >= historial.length) return;

      indiceHistorial = siguiente;
      entrada = historial[indiceHistorial].expresion.replace(/,/g, ".");
      cursor = entrada.length;
      resultado = "";
      error = "";
      congelado = false;
    }

    function limpiarHistorial() {
      historial = [];
      indiceHistorial = -1;
    }

    function estado() {
      return {
        entrada: conComa(entrada),
        cursor,
        resultado,
        error,
        // La vista previa en vivo que muestran las fx modernas mientras escribes.
        vistaPrevia: (() => {
          if (congelado || error || entrada.trim() === "") return "";
          const intento = intentar(entrada);
          return intento.ok ? formatear(intento.valor) : "";
        })(),
        angulo,
        shift,
        esperando,
        memoria: variables.M,
        tieneMemoria: variables.M !== 0,
        variables: { ...variables },
        historial: historial.slice(),
      };
    }

    return {
      insertar, borrar, limpiarTodo, mover, igual,
      alternarAngulo, alternarShift, pedirVariable, elegirVariable,
      memoria, recorrerHistorial, limpiarHistorial, estado,
    };
  }

  global.Calculadora = { crear, formatear, LARGO_MAXIMO, MODOS };
})(typeof window !== "undefined" ? window : globalThis);
