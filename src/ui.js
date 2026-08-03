/**
 * Capa de interfaz: escucha eventos, pinta el estado y no calcula nada.
 * Todo el cálculo vive en expresion.js y calculadora.js.
 */
(function () {
  "use strict";

  const calc = window.Calculadora.crear();

  const elEntrada = document.getElementById("entrada");
  const elResultado = document.getElementById("resultado");
  const elAngulo = document.getElementById("indicador-angulo");
  const elShift = document.getElementById("indicador-shift");
  const elMemoria = document.getElementById("indicador-memoria");
  const elVisor = document.querySelector(".visor");
  const elHistorial = document.getElementById("historial");
  const elAviso = document.getElementById("aviso");

  let temporizadorAviso = null;

  function avisar(texto) {
    elAviso.textContent = texto;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { elAviso.textContent = ""; }, 2000);
  }

  // ------------------------------------------------------------------ pintado

  function pintarEntrada(estado) {
    elEntrada.replaceChildren();

    const antes = estado.entrada.slice(0, estado.cursor);
    const despues = estado.entrada.slice(estado.cursor);

    if (antes) elEntrada.appendChild(document.createTextNode(antes));

    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    elEntrada.appendChild(cursor);

    if (despues) elEntrada.appendChild(document.createTextNode(despues));
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
      boton.setAttribute("aria-label", `Reutilizar ${fila.expresion} igual a ${fila.resultado}`);

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

    pintarEntrada(estado);

    if (estado.error) {
      elResultado.textContent = estado.error;
    } else if (estado.resultado) {
      elResultado.textContent = estado.resultado;
    } else if (estado.vistaPrevia) {
      elResultado.textContent = "= " + estado.vistaPrevia;
    } else {
      elResultado.textContent = "";
    }

    elVisor.classList.toggle("visor--error", Boolean(estado.error));
    elVisor.classList.toggle("visor--previa", !estado.error && !estado.resultado && Boolean(estado.vistaPrevia));

    elAngulo.textContent = estado.angulo;
    elShift.hidden = !estado.shift;
    elMemoria.hidden = !estado.tieneMemoria;

    document.querySelectorAll("[data-ins-shift]").forEach((tecla) => {
      tecla.classList.toggle("tecla--desplazada", estado.shift);
    });

    pintarHistorial(estado.historial);
  }

  // ------------------------------------------------------------------ acciones

  async function copiar() {
    const estado = calc.estado();
    const texto = estado.error || estado.resultado || estado.vistaPrevia || estado.entrada;
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
    igual: () => calc.igual(),
    ac: () => calc.limpiarTodo(),
    del: () => calc.borrar(),
    shift: () => calc.alternarShift(),
    angulo: () => calc.alternarAngulo(),
    izquierda: () => calc.mover(-1),
    derecha: () => calc.mover(1),
    arriba: () => calc.recorrerHistorial(1),
    abajo: () => calc.recorrerHistorial(-1),
    copiar,
    "limpiar-historial": () => calc.limpiarHistorial(),
  };

  function pulsar(tecla) {
    const { ins, insShift, accion, mem, historial } = tecla.dataset;
    const shift = calc.estado().shift;

    if (ins !== undefined) {
      calc.insertar(shift && insShift !== undefined ? insShift : ins);
      if (shift) calc.alternarShift();
      return;
    }
    if (mem !== undefined) { calc.memoria(mem); return; }
    if (historial !== undefined) {
      const fila = calc.estado().historial[Number(historial)];
      if (fila) {
        calc.limpiarTodo();
        calc.insertar(fila.expresion.replace(/,/g, "."));
      }
      return;
    }
    if (accion !== undefined && ACCIONES[accion]) ACCIONES[accion]();
  }

  document.querySelector(".fx").addEventListener("click", (evento) => {
    const tecla = evento.target.closest("button");
    if (!tecla) return;
    pulsar(tecla);
    render();
  });

  // ------------------------------------------------------------------ teclado

  const DIRECTAS = {
    "*": "×", "x": "×", "/": "÷", "+": "+", "-": "-",
    "(": "(", ")": ")", "^": "^", ".": ".", ",": ".", "%": "%", "!": "!",
  };

  const LETRAS = {
    s: "sin(", c: "cos(", t: "tan(", l: "ln(", g: "log(",
    r: "√", p: "π", e: "e", a: "Ans", m: "M",
  };

  document.addEventListener("keydown", (evento) => {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

    const { key } = evento;
    const bajo = key.length === 1 ? key.toLowerCase() : key;

    if (/^[0-9]$/.test(key)) calc.insertar(key);
    else if (DIRECTAS[bajo] !== undefined) calc.insertar(DIRECTAS[bajo]);
    else if (LETRAS[bajo] !== undefined) calc.insertar(LETRAS[bajo]);
    else if (key === "Enter" || key === "=") { evento.preventDefault(); calc.igual(); }
    else if (key === "Backspace") { evento.preventDefault(); calc.borrar(); }
    else if (key === "Escape" || key === "Delete") calc.limpiarTodo();
    else if (key === "ArrowLeft") { evento.preventDefault(); calc.mover(-1); }
    else if (key === "ArrowRight") { evento.preventDefault(); calc.mover(1); }
    else if (key === "ArrowUp") { evento.preventDefault(); calc.recorrerHistorial(1); }
    else if (key === "ArrowDown") { evento.preventDefault(); calc.recorrerHistorial(-1); }
    else if (key === "d") calc.alternarAngulo();
    else return;

    render();
  });

  render();
})();
