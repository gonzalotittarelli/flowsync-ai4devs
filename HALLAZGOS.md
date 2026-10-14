# Hallazgos

Aquí van **las tres líneas** del ejercicio, una por cada punto de abajo. Es lo único que hay que
traer hecho: una parte A a medias con estas tres líneas escritas vale más que lo contrario,
porque lo que se discute en el directo es dónde te chocaste.

Escribe **una sola línea por punto**, con tus palabras y con lo que mediste, no con lo que suponías.

## 1. Lo que falló y lo que siguió en verde

Cuántos de tus casos nuevos fallaron y cuántos de los que ya había siguieron en verde, con la cifra
que te dio la pantalla.

- En `make test-e2e` fallaron 2 de mis 7 casos funcionales nuevos y los 40 que ya había siguieron en verde (`Tests  45 passed, 2 failed (47)`); con los 6 unitarios, `make test` dio 4 rojos de 13 nuevos (`Tests  49 passed, 4 failed (53)`).

## 2. El caso nuevo que pasó

Cuál de tus casos nuevos PASÓ, si alguno pasó, y por qué crees que pasó.

- Pasó «Aplazar resuelve el vencimiento», el único que afirma `isOverdue: true` y sale en verde: lee la respuesta del `PUT`, donde `dueDate` sigue siendo el texto recién asignado, mientras los dos rojos leen por `GET /tasks/:id`, que trae `dueDate` de la base como `Date`, y `Date < '2026-08-20'` siempre da `false`; los otros cuatro verdes esperan `false` y pasan por ese `false` constante, y «tarea hecha con la fecha pasada» además tapa que `isOverdueOn` no mira el estado (el unitario `:47` sale en rojo).

## 3. Tu duda

De qué dudaste, o qué no pudiste comprobar.

- El caso unitario de texto contra `Date` imita lo que entrega la base con `new Date('…T00:00:00.000Z')`, pero `pg` convierte un `date` a la medianoche **local** del proceso (`postgres-date`), y solo coincide porque `backend/.env` fija `TZ=UTC`: no lo corrí con otro huso, así que no sé si con otro `TZ` ese `Date` seguiría representando el mismo día ni si la regla arreglada daría lo mismo.
