# Astrolabio — calculadora sideral

Calculadora web con tema astrológico/científico, hecha con HTML, CSS y JavaScript
puro: **sin dependencias, sin build y sin recursos externos**.

## Uso

Abre `index.html` en el navegador.

## Funciones

- Operaciones básicas: `+`, `−`, `×`, `÷`, con encadenado (`2 + 3 + 4` resuelve sobre la marcha)
- Científicas: `π`, `e`, `√`, `x²`, `±`
- Porcentaje contextual: `100 + 10 %` da **110** (porcentaje del operando anterior),
  mientras que `50 %` suelto da `0,5`
- Control de errores: división entre cero, raíz de un negativo y desbordamiento
  muestran `Error` (la pantalla se marca en rojo)
- Entrada de hasta 16 dígitos, el límite real de precisión de un `double`

### Teclado

| Tecla | Acción |
|---|---|
| `0`–`9` | Insertar dígito |
| `.` o `,` | Coma decimal |
| `+` `-` `*` `/` | Operador |
| `Enter` o `=` | Calcular |
| `Backspace` | Borrar un dígito |
| `Escape` | Limpiar todo |
| `%` | Porcentaje |
| `p` | π |
| `e` | Número e |
| `r` | Raíz cuadrada |
| `q` | Elevar al cuadrado |
| `n` | Cambiar de signo |

## Precisión

Los resultados calculados se redondean con `toPrecision(12)` para absorber el
ruido de coma flotante (`0,1 + 0,2` da `0,3`) **sin** aplastar a cero los números
muy pequeños. Ese formateo se aplica solo a los resultados: lo que se teclea se
muestra tal cual, sin reescribirse.

## Accesibilidad

- La pantalla es un `<output>` con `role="status"` y `aria-live="polite"`, así que
  los lectores de pantalla anuncian cada resultado.
- Todas las teclas no numéricas tienen `aria-label`.
- Todos los pares de color superan el mínimo AA de WCAG (4,5:1); el más bajo es
  8,58:1.
- La capa decorativa está marcada `aria-hidden` y las animaciones se desactivan
  con `prefers-reduced-motion`.

## Estructura

```
index.html   # marcado de la calculadora y de la capa decorativa
styles.css   # tema cósmico, responsive, sin recursos externos
script.js    # lógica de la calculadora
```
