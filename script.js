const elActual = document.getElementById("actual");
const elHistorial = document.getElementById("historial");
const elPantalla = document.querySelector(".pantalla");

const SIMBOLOS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

// Un double solo garantiza ~15-17 cifras significativas; mas alla la entrada
// dejaria de coincidir con el valor con el que realmente se opera.
const MAX_DIGITOS = 16;

let actual = "0";
let anterior = null;
let operador = null;
let reiniciarActual = false;   // el proximo digito empieza una entrada nueva
let esperandoOperando = false; // se pulso un operador y aun no hay 2do operando

// Se aplica SOLO a resultados calculados, nunca a lo que el usuario teclea:
// toPrecision(12) absorbe el ruido de coma flotante (0,1 + 0,2 = 0,3) sin
// aplastar a cero los numeros muy pequenos ni dejar escapar un Infinity.
function formatearResultado(numero) {
  if (!isFinite(numero)) return "Error";
  const ajustado = parseFloat(numero.toPrecision(12));
  return isFinite(ajustado) ? String(ajustado) : "Error";
}

const aPantalla = (texto) => (texto === "Error" ? "Error" : texto.replace(".", ","));

const contarDigitos = (texto) => (texto.match(/\d/g) || []).length;

function render() {
  elActual.textContent = aPantalla(actual);
  elHistorial.textContent =
    anterior !== null && operador
      ? `${aPantalla(formatearResultado(anterior))} ${SIMBOLOS[operador]}`
      : "";
  elPantalla.classList.toggle("pantalla--error", actual === "Error");
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
    esperandoOperando = false;
    return;
  }

  esperandoOperando = false;

  if (caracter === ".") {
    if (!actual.includes(".")) actual += ".";
    return;
  }

  if (contarDigitos(actual) >= MAX_DIGITOS) return;

  if (actual === "0") actual = caracter;
  else if (actual === "-0") actual = "-" + caracter;
  else actual += caracter;
}

// Una constante o una funcion (√, x²) cuentan como operando ya introducido:
// reinician la escritura, pero no dejan la operacion a la espera.
function fijarEntrada(texto) {
  actual = texto;
  reiniciarActual = true;
  esperandoOperando = false;
}

function elegirOperador(op) {
  if (actual === "Error") return;

  if (anterior !== null && operador && !esperandoOperando) {
    resolver();
    if (actual === "Error") return;
  }

  // Siempre despues de resolver: resolver() deja anterior en null y el
  // resultado acumulado debe volver a ser el operando izquierdo.
  anterior = Number(actual);
  operador = op;
  reiniciarActual = true;
  esperandoOperando = true;
}

function resolver() {
  if (anterior === null || operador === null) return;

  const resultado = calcular(anterior, Number(actual), operador);
  actual = resultado === null ? "Error" : formatearResultado(resultado);
  anterior = null;
  operador = null;
  reiniciarActual = true;
  esperandoOperando = false;
}

function limpiar() {
  actual = "0";
  anterior = null;
  operador = null;
  reiniciarActual = false;
  esperandoOperando = false;
}

function borrar() {
  if (actual === "Error" || reiniciarActual) {
    actual = "0";
    reiniciarActual = false;
    esperandoOperando = false;
    return;
  }
  actual = actual.length > 1 ? actual.slice(0, -1) : "0";
  if (actual === "-") actual = "0";
}

// Con una suma o resta pendiente el % es "porcentaje del operando anterior"
// (100 + 10 % = 110). Suelto, o con x y ÷, es simplemente dividir entre 100.
function porcentaje() {
  if (actual === "Error") return;
  const fraccion = Number(actual) / 100;
  const relativo = anterior !== null && (operador === "+" || operador === "-");
  actual = formatearResultado(relativo ? anterior * fraccion : fraccion);
  reiniciarActual = false;
  esperandoOperando = false;
}

function signo() {
  if (actual === "Error" || actual === "0") return;
  actual = actual.startsWith("-") ? actual.slice(1) : "-" + actual;
}

function raiz() {
  if (actual === "Error") return;
  const valor = Number(actual);
  fijarEntrada(valor < 0 ? "Error" : formatearResultado(Math.sqrt(valor)));
}

function cuadrado() {
  if (actual === "Error") return;
  fijarEntrada(formatearResultado(Number(actual) ** 2));
}

const ACCIONES = {
  limpiar,
  borrar,
  porcentaje,
  signo,
  raiz,
  cuadrado,
  igual: resolver,
  pi: () => fijarEntrada(formatearResultado(Math.PI)),
  euler: () => fijarEntrada(formatearResultado(Math.E)),
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

const ATAJOS = {
  Escape: limpiar,
  Backspace: borrar,
  "%": porcentaje,
  p: ACCIONES.pi,
  e: ACCIONES.euler,
  r: raiz,
  q: cuadrado,
  n: signo,
};

document.addEventListener("keydown", (evento) => {
  const { key } = evento;
  const minuscula = key.length === 1 ? key.toLowerCase() : key;

  if (/^[0-9]$/.test(key)) agregarNumero(key);
  else if (key === "." || key === ",") agregarNumero(".");
  else if (["+", "-", "*", "/"].includes(key)) elegirOperador(key);
  else if (key === "Enter" || key === "=") {
    evento.preventDefault();
    resolver();
  } else if (ATAJOS[minuscula]) ATAJOS[minuscula]();
  else return;

  render();
});

render();
