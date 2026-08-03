const elActual = document.getElementById("actual");
const elHistorial = document.getElementById("historial");

const SIMBOLOS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

let actual = "0";
let anterior = null;
let operador = null;
let reiniciarActual = false;

function formatear(valor) {
  const numero = Number(valor);
  if (!isFinite(numero)) return "Error";
  // Redondeo para evitar artefactos de punto flotante (0.1 + 0.2).
  const redondeado = Math.round(numero * 1e12) / 1e12;
  return String(redondeado).replace(".", ",");
}

function render() {
  elActual.textContent = actual === "Error" ? "Error" : formatear(actual);
  elHistorial.textContent =
    anterior !== null && operador
      ? `${formatear(anterior)} ${SIMBOLOS[operador]}`
      : "";
}

function calcular(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? null : a / b;
    default:
      return b;
  }
}

function agregarNumero(caracter) {
  if (actual === "Error") limpiar();

  if (reiniciarActual) {
    actual = caracter === "." ? "0." : caracter;
    reiniciarActual = false;
    return;
  }

  if (caracter === ".") {
    if (!actual.includes(".")) actual += ".";
    return;
  }

  actual = actual === "0" ? caracter : actual + caracter;
}

function elegirOperador(op) {
  if (actual === "Error") return;

  if (anterior !== null && operador && !reiniciarActual) {
    resolver();
    if (actual === "Error") return;
  }

  // Siempre después de resolver: resolver() deja anterior en null y el
  // resultado acumulado debe volver a ser el operando izquierdo.
  anterior = Number(actual);
  operador = op;
  reiniciarActual = true;
}

function resolver() {
  if (anterior === null || operador === null) return;

  const resultado = calcular(anterior, Number(actual), operador);
  actual = resultado === null ? "Error" : String(resultado);
  anterior = null;
  operador = null;
  reiniciarActual = true;
}

function limpiar() {
  actual = "0";
  anterior = null;
  operador = null;
  reiniciarActual = false;
}

function borrar() {
  if (actual === "Error" || reiniciarActual) {
    actual = "0";
    reiniciarActual = false;
    return;
  }
  actual = actual.length > 1 ? actual.slice(0, -1) : "0";
}

function porcentaje() {
  if (actual === "Error") return;
  actual = String(Number(actual) / 100);
  reiniciarActual = false;
}

const ACCIONES = {
  limpiar,
  borrar,
  porcentaje,
  igual: resolver,
};

document.querySelector(".teclado").addEventListener("click", (evento) => {
  const tecla = evento.target.closest(".tecla");
  if (!tecla) return;

  const { numero, operador: op, accion } = tecla.dataset;

  if (numero !== undefined) agregarNumero(numero);
  else if (op !== undefined) elegirOperador(op);
  else if (accion !== undefined) ACCIONES[accion]();

  render();
});

document.addEventListener("keydown", (evento) => {
  const { key } = evento;

  if (/^[0-9]$/.test(key)) agregarNumero(key);
  else if (key === "." || key === ",") agregarNumero(".");
  else if (["+", "-", "*", "/"].includes(key)) elegirOperador(key);
  else if (key === "Enter" || key === "=") {
    evento.preventDefault();
    resolver();
  } else if (key === "Backspace") borrar();
  else if (key === "Escape") limpiar();
  else if (key === "%") porcentaje();
  else return;

  render();
});

render();
