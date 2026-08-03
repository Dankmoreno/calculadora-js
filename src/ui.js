/**
 * Capa de interfaz: escucha eventos, pinta el estado y no calcula nada.
 * Toda la aritmética vive en calculadora.js.
 */
(function () {
  "use strict";

  const calc = window.Calculadora.crear();

  const elPantalla = document.querySelector(".pantalla");
  const elActual = document.getElementById("actual");
  const elContexto = document.getElementById("contexto");
  const elMemoria = document.getElementById("indicador-memoria");
  const elAngulo = document.getElementById("indicador-angulo");
  const elHistorial = document.getElementById("historial");
  const elAviso = document.getElementById("aviso");

  let temporizadorAviso = null;

  function avisar(texto) {
    elAviso.textContent = texto;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { elAviso.textContent = ""; }, 2000);
  }

  function pintarHistorial(filas) {
    elHistorial.replaceChildren();

    if (filas.length === 0) {
      const vacio = document.createElement("li");
      vacio.className = "historial__vacio";
      vacio.textContent = "Sin operaciones todavía";
      elHistorial.appendChild(vacio);
      return;
    }

    filas.forEach((fila, indice) => {
      const item = document.createElement("li");
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "historial__fila";
      boton.dataset.historial = String(indice);
      boton.setAttribute("aria-label", `Usar el resultado ${fila.resultado} de ${fila.expresion}`);

      const expresion = document.createElement("span");
      expresion.className = "historial__expresion";
      expresion.textContent = fila.expresion;

      const resultado = document.createElement("span");
      resultado.className = "historial__resultado";
      resultado.textContent = fila.resultado;

      boton.append(expresion, resultado);
      item.appendChild(boton);
      elHistorial.appendChild(item);
    });
  }

  function render() {
    const estado = calc.estado();

    elActual.textContent = estado.pantalla;
    elContexto.textContent = estado.contexto;
    elPantalla.classList.toggle("pantalla--error", estado.error);

    elMemoria.hidden = !estado.tieneMemoria;
    elAngulo.textContent = estado.angulo;
    elAngulo.setAttribute(
      "aria-label",
      estado.angulo === "DEG"
        ? "Ángulos en grados. Pulsa para cambiar a radianes"
        : "Ángulos en radianes. Pulsa para cambiar a grados"
    );

    pintarHistorial(estado.historial);
  }

  async function copiar() {
    const texto = calc.estado().pantalla;
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Copiado");
    } catch (e) {
      // El portapapeles asíncrono no está disponible en todos los contextos.
      const auxiliar = document.createElement("textarea");
      auxiliar.value = texto;
      auxiliar.setAttribute("readonly", "");
      auxiliar.style.position = "absolute";
      auxiliar.style.left = "-9999px";
      document.body.appendChild(auxiliar);
      auxiliar.select();
      const ok = document.execCommand("copy");
      auxiliar.remove();
      avisar(ok ? "Copiado" : "No se pudo copiar");
    }
  }

  const ACCIONES = {
    limpiar: () => calc.limpiar(),
    borrar: () => calc.borrar(),
    igual: () => calc.igual(),
    porcentaje: () => calc.porcentaje(),
    signo: () => calc.signo(),
    punto: () => calc.punto(),
    angulo: () => calc.alternarAngulo(),
    copiar,
    "limpiar-historial": () => calc.limpiarHistorial(),
  };

  document.querySelector(".panel").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) return;

    const { numero, operador, funcion, constante, memoria, accion, historial } = boton.dataset;

    if (numero !== undefined) calc.digito(numero);
    else if (operador !== undefined) calc.operador(operador);
    else if (funcion !== undefined) calc.funcion(funcion);
    else if (constante !== undefined) calc.constante(constante);
    else if (memoria !== undefined) calc.memoria(memoria);
    else if (historial !== undefined) calc.usarDelHistorial(Number(historial));
    else if (accion !== undefined && ACCIONES[accion]) ACCIONES[accion]();
    else return;

    render();
  });

  // Atajos de una sola tecla. Los que llevan modificador se tratan aparte.
  const ATAJOS = {
    Escape: () => calc.limpiar(),
    Backspace: () => calc.borrar(),
    Delete: () => calc.limpiar(),
    "%": () => calc.porcentaje(),
    p: () => calc.constante("pi"),
    e: () => calc.constante("e"),
    r: () => calc.funcion("raiz"),
    q: () => calc.funcion("cuadrado"),
    i: () => calc.funcion("inverso"),
    f: () => calc.funcion("factorial"),
    l: () => calc.funcion("ln"),
    g: () => calc.funcion("log"),
    s: () => calc.funcion("sin"),
    c: () => calc.funcion("cos"),
    t: () => calc.funcion("tan"),
    n: () => calc.signo(),
    d: () => calc.alternarAngulo(),
    "^": () => calc.operador("^"),
  };

  document.addEventListener("keydown", (evento) => {
    // Ctrl+C debe seguir copiando la selección del navegador.
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

    const { key } = evento;
    const simple = key.length === 1 ? key.toLowerCase() : key;

    if (/^[0-9]$/.test(key)) calc.digito(key);
    else if (key === "." || key === ",") calc.punto();
    else if (["+", "-", "*", "/"].includes(key)) calc.operador(key);
    else if (key === "Enter" || key === "=") {
      evento.preventDefault();
      calc.igual();
    } else if (ATAJOS[simple]) {
      evento.preventDefault();
      ATAJOS[simple]();
    } else return;

    render();
  });

  render();
})();
