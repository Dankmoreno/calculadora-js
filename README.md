# Astrolabio fx — calculadora científica

[![Pruebas](https://github.com/Dankmoreno/calculadora-js/actions/workflows/ci.yml/badge.svg)](https://github.com/Dankmoreno/calculadora-js/actions/workflows/ci.yml)

Calculadora científica al estilo de una **fx**, hecha con HTML, CSS y JavaScript
puro: **sin dependencias, sin build y sin recursos externos**.

🔗 **En vivo:** https://dankmoreno.github.io/calculadora-js/

## Qué la hace una fx

Escribes la **expresión completa** y luego pulsas `=`, en vez de ir operando
tecla a tecla. Eso trae lo que se espera de una científica:

- **Precedencia de operadores y paréntesis:** `2+3×4` da `14`, no `20`.
- **Vista previa en vivo:** mientras escribes, el visor muestra el valor de la
  expresión si ya es válida.
- **Cursor y edición:** `◀ ▶` mueven dentro de la expresión, `DEL` borra el
  token completo que haya antes (una `sin(` se va de una vez, no letra a letra).
- **Corrección de errores:** si la expresión falla, se conserva en pantalla y el
  cursor salta a la posición del fallo, como en una fx real.
- **Cierre automático de paréntesis:** `sin(30` se resuelve sin cerrar.
- **Multiplicación implícita:** `2π`, `3(4+5)`, `2sin(30)`, `2√9`.
- **`Ans`:** al pulsar un operador tras un resultado, la expresión continúa
  desde él.

## Funciones

| Grupo | Teclas |
|---|---|
| Aritmética | `+` `−` `×` `÷` `^` `(` `)` `(−)` |
| Potencias y raíces | `x⁻¹` `x²` `x³` `xʸ` `√` `∛` |
| Trigonometría | `sin` `cos` `tan` y sus inversas con `SHIFT` |
| Logaritmos | `ln` `log`, y `eˣ` `10ˣ` con `SHIFT` |
| Otras | `n!` `%` `EXP` `π` `e` (con `SHIFT`) `abs` (con `SHIFT`) `Ans` |
| Memoria | `M+` `M−` `MR` `MC` con indicador `M` |
| Modos | `ANG` alterna **DEG → RAD → GRA** |

- **Porcentaje contextual:** `100+10%` da `110`; `50%` suelto da `0,5`.
- **Historial** de las últimas 30 expresiones. `▲ ▼` las recorren y al pulsar
  una fila se recupera.
- **Errores al estilo fx:** `Syntax ERROR` y `Math ERROR` (división entre cero,
  raíz o logaritmo de un negativo, `tan` en una asíntota, factorial no entero,
  desbordamiento).
- **Notación científica** automática fuera del rango del visor:
  `1,23456789×10¹²`.

### Teclado físico

| Tecla | Acción | | Tecla | Acción |
|---|---|---|---|---|
| `0`–`9` | Dígito | | `s` `c` `t` | sin / cos / tan |
| `.` o `,` | Coma decimal | | `l` `g` | ln / log |
| `+ - * /` | Operadores | | `r` | √ |
| `^` | Potencia | | `p` `e` | π / e |
| `(` `)` | Paréntesis | | `a` `m` | Ans / M |
| `Enter` o `=` | Calcular | | `d` | Alternar DEG/RAD/GRA |
| `Backspace` | DEL | | `←` `→` | Mover el cursor |
| `Escape` | AC | | `↑` `↓` | Recorrer el historial |

Las combinaciones con `Ctrl`, `Alt` o `Cmd` se ignoran, para no pisar los
atajos del navegador.

## Estructura

```
index.html              visor, teclados y capa decorativa
styles.css              tema cósmico, responsive, sin recursos externos
src/
  expresion.js          tokeniza, analiza y evalúa una expresión completa
  calculadora.js        línea de entrada, cursor, historial, memoria y modos
  ui.js                 eventos y pintado; no calcula nada
pruebas/
  expresion.html        pruebas del motor de expresiones
  nucleo.html           pruebas del controlador
  interfaz.html         DOM, accesibilidad, contraste y maquetación
  marco.js              micro-marco de pruebas
  ejecutar.sh           runner headless para la CI
.github/workflows/      pruebas en cada push y publicación en Pages
```

Las tres capas están separadas a propósito: `expresion.js` no sabe que existe
una calculadora, `calculadora.js` no sabe que existe un navegador y `ui.js` no
calcula. Cada una se prueba por su cuenta.

### Gramática que acepta el motor

```
expresion := termino (('+' | '-') termino)*
termino   := unario (('×' | '÷') unario | implícita)*
unario    := ('-' | '+') unario | potencia
potencia  := postfijo ('^' unario)?          // asociativa por la derecha
postfijo  := primario ('!' | '²' | '³' | '⁻¹' | '%')*
primario  := número | constante | variable | función '(' expresion ')'
           | '(' expresion ')' | ('√' | '∛') unario
```

De ahí salen los comportamientos esperables: `2^3^2` es `512` (no `64`),
`-2^2` es `-4` y `√9×2` es `6`.

## Pruebas

**En el navegador:** abre `pruebas/expresion.html` o `pruebas/nucleo.html`
directamente (doble clic). `pruebas/interfaz.html` carga `index.html` en un
iframe, así que necesita que el proyecto se sirva por http:

```sh
python -m http.server 8123
# y abre http://127.0.0.1:8123/pruebas/interfaz.html
```

**Desde la terminal** (Linux/macOS, o Git Bash con python3 y Chrome):

```sh
bash pruebas/ejecutar.sh
```

Devuelve un código de salida distinto de cero si algo falla, que es lo que usa
la CI. Cobertura actual: **243 casos** — 90 del motor de expresiones, 78 del
controlador y 75 de interfaz.

## Precisión

Los resultados se redondean con `toPrecision(12)` para absorber el ruido de
coma flotante (`0,1+0,2` da `0,3`) y luego se muestran con hasta 10 cifras
significativas, como una fx. Ese formateo se aplica solo a los resultados: lo
que se teclea se muestra tal cual. La entrada admite 120 caracteres.

## Accesibilidad

- El resultado es un `<output>` con `role="status"` y `aria-live="polite"`: los
  lectores de pantalla anuncian cada resultado.
- Todos los botones no numéricos tienen `aria-label`, incluidas las segundas
  funciones de `SHIFT`.
- Todos los pares de color superan el mínimo AA de WCAG (4,5:1). El contraste se
  verifica en las pruebas sobre los colores realmente renderizados, no sobre los
  valores del código.
- La capa decorativa y el cursor están marcados `aria-hidden`, y las animaciones
  se desactivan con `prefers-reduced-motion`.
