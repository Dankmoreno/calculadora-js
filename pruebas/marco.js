/**
 * Micro-marco de pruebas: sin dependencias, corre en el navegador.
 * Publica el resumen en el DOM y en una línea que la CI puede leer.
 */
(function (global) {
  "use strict";

  const lineas = [];
  let total = 0;
  let fallos = 0;

  function seccion(titulo) {
    lineas.push("", "=== " + titulo + " ===");
  }

  function comparar(nombre, obtenido, esperado) {
    total++;
    const ok = Object.is(obtenido, esperado);
    if (!ok) fallos++;
    lineas.push(
      `${ok ? "PASA " : "FALLA"} | ${nombre}` +
      (ok ? ` | "${obtenido}"` : ` | obtenido="${obtenido}" esperado="${esperado}"`)
    );
  }

  function afirmar(nombre, condicion, detalle) {
    total++;
    if (!condicion) fallos++;
    lineas.push(`${condicion ? "PASA " : "FALLA"} | ${nombre}${condicion ? "" : " | " + detalle}`);
  }

  function publicar(destino) {
    const resumen = `TOTAL: ${total - fallos}/${total} pasan, ${fallos} fallan`;
    lineas.push("", "=== " + resumen + " ===");

    const salida = document.getElementById(destino || "salida");
    salida.textContent = lineas.join("\n");
    salida.classList.add(fallos === 0 ? "todo-bien" : "hay-fallos");

    // Marcador estable para el runner de integración continua.
    const marca = document.createElement("pre");
    marca.id = "resultado-ci";
    marca.textContent = `@@RESULTADO@@ fallos=${fallos} total=${total}`;
    document.body.appendChild(marca);
  }

  global.Pruebas = { seccion, comparar, afirmar, publicar };
})(window);
