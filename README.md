# Calculadora

Calculadora web hecha con HTML, CSS y JavaScript puro (sin dependencias ni build).

## Uso

Abre `index.html` en el navegador.

## Funciones

- Operaciones básicas: `+`, `−`, `×`, `÷`
- Porcentaje (`%`), borrar último dígito (`⌫`) y limpiar todo (`AC`)
- Operaciones encadenadas (`2 + 3 + 4` resuelve sobre la marcha)
- División entre cero controlada (muestra `Error`)
- Soporte de teclado:

| Tecla | Acción |
|---|---|
| `0`–`9` | Insertar dígito |
| `.` o `,` | Punto decimal |
| `+` `-` `*` `/` | Operador |
| `Enter` o `=` | Calcular |
| `Backspace` | Borrar un dígito |
| `Escape` | Limpiar todo |
| `%` | Porcentaje |

## Estructura

```
index.html   # marcado de la calculadora
styles.css   # estilos (tema oscuro, responsive)
script.js    # lógica de la calculadora
```
