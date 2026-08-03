# Astrolabio — calculadora sideral

[![Pruebas](https://github.com/Dankmoreno/calculadora-js/actions/workflows/ci.yml/badge.svg)](https://github.com/Dankmoreno/calculadora-js/actions/workflows/ci.yml)

Calculadora científica con tema astrológico, hecha con HTML, CSS y JavaScript
puro: **sin dependencias, sin build y sin recursos externos**.

🔗 **En vivo:** https://dankmoreno.github.io/calculadora-js/

## Uso

Abre `index.html` en el navegador. No hace falta instalar ni compilar nada.

## Funciones

- **Aritmética:** `+`, `−`, `×`, `÷` y potencia `xʸ`, con encadenado
  (`2 + 3 + 4` resuelve sobre la marcha)
- **Científicas:** `sin`, `cos`, `tan`, `ln`, `log`, `√`, `x²`, `1/x`, `n!`,
  constantes `π` y `e`, y cambio de signo `±`
- **Ángulos:** interruptor RAD/DEG. En grados se limpia el ruido de coma
  flotante (`sen 180°` da `0`, no `1,22e-16`); en radianes no, porque ahí un
  valor diminuto sí puede ser el resultado real
- **Memoria:** `MC`, `MR`, `M+`, con indicador `M` en pantalla
- **Historial** de las últimas 50 operaciones; al pulsar una fila se reutiliza
  su resultado
- **Copiar** el resultado al portapapeles
- **Porcentaje contextual:** `100 + 10 %` da `110` (porcentaje del operando
  anterior), mientras que `50 %` suelto da `0,5`
- **Errores controlados:** división entre cero, raíz o logaritmo de un negativo,
  `1/0`, factorial no entero y desbordamiento muestran `Error` y la pantalla se
  marca en rojo

### Teclado

| Tecla | Acción | | Tecla | Acción |
|---|---|---|---|---|
| `0`–`9` | Dígito | | `p` | π |
| `.` o `,` | Coma decimal | | `e` | Número e |
| `+` `-` `*` `/` | Operador | | `r` | Raíz cuadrada |
| `^` | Potencia | | `q` | Elevar al cuadrado |
| `Enter` o `=` | Calcular | | `i` | Inverso (1/x) |
| `Backspace` | Borrar un dígito | | `f` | Factorial |
| `Escape` | Limpiar todo | | `l` / `g` | ln / log |
| `%` | Porcentaje | | `s` `c` `t` | sin / cos / tan |
| `n` | Cambiar de signo | | `d` | Alternar RAD/DEG |

Las combinaciones con `Ctrl`, `Alt` o `Cmd` se ignoran, para no pisar los
atajos del navegador.

## Estructura

```
index.html              marcado de la calculadora y de la capa decorativa
styles.css              tema cósmico, responsive, sin recursos externos
src/
  calculadora.js        núcleo de cálculo: sin DOM, testeable aislado
  ui.js                 eventos y pintado; no calcula nada
pruebas/
  nucleo.html           pruebas del núcleo (se abren directamente)
  interfaz.html         pruebas de DOM, accesibilidad, contraste y layout
  marco.js              micro-marco de pruebas
  ejecutar.sh           runner headless para la CI
.github/workflows/      pruebas en cada push y publicación en Pages
```

La separación entre `calculadora.js` y `ui.js` es deliberada: el núcleo no
conoce el DOM, así que se puede probar sin navegador simulado y añadir
funciones nuevas no obliga a tocar el pintado.

## Pruebas

**En el navegador:** abre `pruebas/nucleo.html` directamente (doble clic).
`pruebas/interfaz.html` carga `index.html` en un iframe, así que necesita que el
proyecto se sirva por http; desde la raíz, por ejemplo:

```sh
python -m http.server 8123
# y abre http://127.0.0.1:8123/pruebas/interfaz.html
```

**Desde la terminal** (Linux/macOS, o Git Bash con python3 y Chrome):

```sh
bash pruebas/ejecutar.sh
```

Devuelve un código de salida distinto de cero si algo falla, que es lo que usa
la CI. Cobertura actual: **134 casos** — 75 del núcleo y 59 de interfaz.

## Precisión

Los resultados calculados se redondean con `toPrecision(12)` para absorber el
ruido de coma flotante (`0,1 + 0,2` da `0,3`) **sin** aplastar a cero los
números muy pequeños ni dejar escapar un `Infinity`. Ese formateo se aplica solo
a los resultados: lo que se teclea se muestra tal cual, sin reescribirse. La
entrada se limita a 16 dígitos, el límite real de precisión de un `double`.

## Accesibilidad

- La pantalla es un `<output>` con `role="status"` y `aria-live="polite"`: los
  lectores de pantalla anuncian cada resultado.
- Todos los botones no numéricos tienen `aria-label`.
- Todos los pares de color superan el mínimo AA de WCAG (4,5:1); el más bajo
  medido es 8,58:1. El contraste se verifica en las pruebas sobre los colores
  realmente renderizados, no sobre los valores del código.
- La capa decorativa está marcada `aria-hidden` y las animaciones se desactivan
  con `prefers-reduced-motion`.
