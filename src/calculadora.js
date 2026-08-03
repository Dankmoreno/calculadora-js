/**
 * Núcleo de cálculo. No toca el DOM ni conoce la interfaz: recibe pulsaciones,
 * mantiene el estado y devuelve una instantánea. Así puede probarse aislado.
 */
(function (global) {
  "use strict";

  // Un double solo garantiza ~15-17 cifras significativas; más allá la entrada
  // dejaría de coincidir con el valor con el que realmente se opera.
  const MAX_DIGITOS = 16;
  const LIMITE_HISTORIAL = 50;

  // 170! es el último factorial que cabe en un double.
  const MAX_FACTORIAL = 170;

  const SIMBOLOS = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };

  /**
   * Se aplica SOLO a resultados calculados, nunca a lo que el usuario teclea:
   * toPrecision(12) absorbe el ruido de coma flotante (0,1 + 0,2 = 0,3) sin
   * aplastar a cero los números muy pequeños ni dejar escapar un Infinity.
   */
  function formatear(numero) {
    if (!isFinite(numero)) return "Error";
    const ajustado = parseFloat(numero.toPrecision(12));
    return isFinite(ajustado) ? String(ajustado) : "Error";
  }

  const conComa = (texto) => (texto === "Error" ? "Error" : texto.replace(".", ","));
  const contarDigitos = (texto) => (texto.match(/\d/g) || []).length;

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) return NaN;
    if (n > MAX_FACTORIAL) return Infinity;
    let resultado = 1;
    for (let i = 2; i <= n; i++) resultado *= i;
    return resultado;
  }

  function operar(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;   // NaN se formatea como "Error"
      case "^": return Math.pow(a, b);
      default:  return b;
    }
  }

  function crear() {
    let entrada = "0";
    let acumulado = null;
    let operador = null;
    let reiniciar = false;          // el próximo dígito empieza entrada nueva
    let esperandoOperando = false;  // se pulsó un operador y aún no hay 2º operando
    let memoria = 0;
    let grados = false;             // false = radianes
    let historial = [];

    const hayError = () => entrada === "Error";
    const valor = () => Number(entrada);

    // Una constante, una función o un valor recuperado cuentan como operando ya
    // introducido: reinician la escritura pero no dejan la operación a la espera.
    function fijar(texto) {
      entrada = texto;
      reiniciar = true;
      esperandoOperando = false;
    }

    function digito(caracter) {
      if (hayError()) limpiar();

      if (reiniciar) {
        entrada = caracter;
        reiniciar = false;
        esperandoOperando = false;
        return;
      }

      esperandoOperando = false;
      if (contarDigitos(entrada) >= MAX_DIGITOS) return;

      if (entrada === "0") entrada = caracter;
      else if (entrada === "-0") entrada = "-" + caracter;
      else entrada += caracter;
    }

    function punto() {
      if (hayError()) limpiar();

      if (reiniciar) {
        entrada = "0.";
        reiniciar = false;
        esperandoOperando = false;
        return;
      }

      esperandoOperando = false;
      if (!entrada.includes(".")) entrada += ".";
    }

    function elegirOperador(op) {
      if (hayError()) return;

      if (acumulado !== null && operador && !esperandoOperando) {
        igual();
        if (hayError()) return;
      }

      // Siempre después de resolver: igual() deja acumulado en null y el
      // resultado debe volver a ser el operando izquierdo.
      acumulado = valor();
      operador = op;
      reiniciar = true;
      esperandoOperando = true;
    }

    function igual() {
      if (hayError() || acumulado === null || operador === null) return;

      const izquierdo = acumulado;
      const derecho = valor();
      const op = operador;
      const resultado = formatear(operar(izquierdo, derecho, op));

      historial.unshift({
        expresion: `${conComa(formatear(izquierdo))} ${SIMBOLOS[op]} ${conComa(formatear(derecho))}`,
        resultado,
      });
      if (historial.length > LIMITE_HISTORIAL) historial.pop();

      entrada = resultado;
      acumulado = null;
      operador = null;
      reiniciar = true;
      esperandoOperando = false;
    }

    function limpiar() {
      entrada = "0";
      acumulado = null;
      operador = null;
      reiniciar = false;
      esperandoOperando = false;
    }

    function borrar() {
      if (hayError() || reiniciar) {
        entrada = "0";
        reiniciar = false;
        esperandoOperando = false;
        return;
      }
      entrada = entrada.length > 1 ? entrada.slice(0, -1) : "0";
      if (entrada === "-") entrada = "0";
    }

    // Con una suma o resta pendiente el % es "porcentaje del operando anterior"
    // (100 + 10 % = 110). Suelto, o con × y ÷, es simplemente dividir entre 100.
    function porcentaje() {
      if (hayError()) return;
      const fraccion = valor() / 100;
      const relativo = acumulado !== null && (operador === "+" || operador === "-");
      entrada = formatear(relativo ? acumulado * fraccion : fraccion);
      reiniciar = false;
      esperandoOperando = false;
    }

    function signo() {
      if (hayError() || entrada === "0") return;
      entrada = entrada.startsWith("-") ? entrada.slice(1) : "-" + entrada;
    }

    function constante(nombre) {
      if (nombre === "pi") fijar(formatear(Math.PI));
      else if (nombre === "e") fijar(formatear(Math.E));
    }

    const aRadianes = (x) => (grados ? (x * Math.PI) / 180 : x);

    // En grados, los ángulos notables producen ruido (sen 180° = 1,22e-16).
    // En radianes no se toca: ahí un valor diminuto sí puede ser el resultado real.
    const sinRuido = (r) => (grados && Math.abs(r) < 1e-12 ? 0 : r);

    function tangente(x) {
      // tan es asíntota en 90° + k·180°.
      if (grados && (Math.abs(x) - 90) % 180 === 0) return NaN;
      return Math.tan(aRadianes(x));
    }

    function funcion(nombre) {
      if (hayError()) return;
      const x = valor();
      let r;

      switch (nombre) {
        case "raiz":      r = x < 0 ? NaN : Math.sqrt(x); break;
        case "cuadrado":  r = x * x; break;
        case "inverso":   r = x === 0 ? NaN : 1 / x; break;
        case "factorial": r = factorial(x); break;
        case "ln":        r = x <= 0 ? NaN : Math.log(x); break;
        case "log":       r = x <= 0 ? NaN : Math.log10(x); break;
        case "sin":       r = sinRuido(Math.sin(aRadianes(x))); break;
        case "cos":       r = sinRuido(Math.cos(aRadianes(x))); break;
        case "tan":       r = sinRuido(tangente(x)); break;
        default: return;
      }

      fijar(formatear(r));
    }

    function accionMemoria(que) {
      switch (que) {
        case "limpiar":    memoria = 0; break;
        case "sumar":      if (!hayError()) memoria += valor(); break;
        case "restar":     if (!hayError()) memoria -= valor(); break;
        case "recuperar":  fijar(formatear(memoria)); break;
      }
    }

    function alternarAngulo() {
      grados = !grados;
    }

    function usarDelHistorial(indice) {
      const fila = historial[indice];
      if (fila && fila.resultado !== "Error") fijar(fila.resultado);
    }

    function limpiarHistorial() {
      historial = [];
    }

    function estado() {
      return {
        pantalla: conComa(entrada),
        contexto:
          acumulado !== null && operador
            ? `${conComa(formatear(acumulado))} ${SIMBOLOS[operador]}`
            : "",
        error: hayError(),
        memoria,
        tieneMemoria: memoria !== 0,
        angulo: grados ? "DEG" : "RAD",
        historial: historial.map((fila) => ({ ...fila, resultado: conComa(fila.resultado) })),
      };
    }

    return {
      digito, punto, operador: elegirOperador, igual, limpiar, borrar,
      porcentaje, signo, constante, funcion, memoria: accionMemoria,
      alternarAngulo, usarDelHistorial, limpiarHistorial, estado,
    };
  }

  global.Calculadora = { crear, formatear, MAX_DIGITOS, MAX_FACTORIAL };
})(typeof window !== "undefined" ? window : globalThis);
