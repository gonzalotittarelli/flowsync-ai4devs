# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

## Cómo se lanzaron

Los prompts se lanzaron desde la raíz del repositorio, en la rama `tests-gt`, con una
**configuración aislada** (`CLAUDE_CONFIG_DIR=~/.claude-aislado claude`) que excluye el `CLAUDE.md`
global del usuario y sus hooks, así que el agente solo vio las instrucciones y los hooks del proyecto.

Línea de partida, antes del primer prompt: `make test` dio `Tests  40 passed (40)` y `make test-unit`
dio `NO TESTS EXECUTED`, porque `backend/tests/unit/` no existía. Para llegar ahí hubo que completar
un `backend/.env` creado antes de que existieran las variables `DB_*` (`make env` no pisa un `.env`
que ya existe). Además, correr cualquier suite regenera cuatro ficheros de `backend/.adonisjs/`,
porque el versionado en `s11/start` no incluye las rutas de la papelera. Ese diff no entra en ningún commit.

---

# Parte A: el contrato primero

## Prompt 1

**Modelo:** Sonnet 5.5 (`claude-sonnet-5-5`)
**Herramienta:** Claude Code 2.1.299 (config aislada, `CLAUDE_CONFIG_DIR=~/.claude-aislado`)

```
Leé entero el Requirement «Cuándo una tarea está vencida» de openspec/specs/tasks/spec.md y sus siete Scenarios. Es la única unidad de trabajo: no cubras ningún otro Requirement.

Escribí un archivo de tests funcionales nuevo, backend/tests/functional/tasks/overdue.spec.ts, con un test por Scenario y cada test titulado como su Scenario. Cada test entra por HTTP, como el cliente que consume este backend, y afirma sobre el campo isOverdue que viaja en el cuerpo de la respuesta. Nada de llamar a métodos del modelo ni de leer la base para afirmar.

Las restricciones son estas y no se negocian:
- No toques ni una línea fuera de backend/tests/. Ni el modelo, ni el transformer, ni el controlador, ni las rutas. Si un test falla, se queda en rojo: esto termina con los tests escritos y fallando, no con la implementación arreglada.
- Correr los tests regenera backend/.adonisjs/ porque el versionado está desfasado. Ese diff no es tuyo: no lo commitees.
- El día de referencia se le pasa a la petición en el parámetro today, con fechas fijas escritas en el test. Nada de la fecha de hoy ni de ningún reloj: ni DateTime.now(), ni new Date(), ni nada que dependa de cuándo se corra.
- Aislamiento: el mismo que ya usan backend/tests/functional/tasks/assignee.spec.ts y trash.spec.ts. Leelos y seguí su forma; no inventes otra.
- No des por hecho ningún identificador: usá el id que devuelva la creación de la tarea.
- Si un Scenario no se puede montar solo con la API (por ejemplo, «creada hace semanas»), o hay que elegir qué endpoint lo ejerce, decime qué elegiste y por qué, en vez de decidirlo callado.

No abras PR ni empujes. Cuando esté, corré make test-e2e desde la raíz y pegame la salida entera, sin resumir. Después decime qué tests nuevos fallaron y con qué aserción, cuántos pasaron, y cuántos de los que ya existían siguen en verde.
```

**Qué salió:** Escribió `backend/tests/functional/tasks/overdue.spec.ts` (173 líneas): siete tests titulados como sus Scenarios, con `withGlobalTransaction()` y `User.create` como `assignee.spec.ts` y `trash.spec.ts`, y el día de referencia fijo (`HOY = '2026-08-20'`). Ningún reloj en el fichero. Monta cada tarea solo por la API: `POST /tasks` la crea pendiente y sin fecha, `PUT /tasks/:id/due-date` le pone la fecha y `PATCH /tasks/:id/status` le cambia el estado. Lee con `GET /tasks/:id?today=…`, y en «Aplazar resuelve el vencimiento» afirma sobre la respuesta del propio `PUT`, porque el Scenario dice «en la misma respuesta de ese cambio». Avisó de que «creada hace semanas» no se puede montar por la API (`createdAt` lo pone el servidor), así que consulta la tarea sin fecha con `today=2100-01-01` y reconoció que eso no acredita la antigüedad real. Como alternativa propuso `Task.create` con `createdAt`. `make test-e2e`: `Tests  45 passed, 2 failed (47)`. Los 40 que ya había, en verde. Fallan «Fecha del día anterior» (`overdue.spec.ts:92`) y «Darla por hecha la deja de vencer» (`:138`), los dos con `expected false to be true`. El segundo cae en la aserción de antes del cambio a `done`, así que la parte de `done` no llega a ejecutarse. No tocó nada fuera de `backend/tests/` ni commiteó. Al pegar la salida «entera» la reescribió con cortes y después avisó de dos errores de transcripción suyos, así que la cifra sale de volver a correr `make test-e2e` desde mi terminal. Atribuyó los dos rojos a la lectura y señaló que `isOverdueOn` no mira el estado. 1 min 59 s.

# Parte B: bajar la regla, y solo la regla

## Prompt 2

**Modelo:** Sonnet 5.5 (`claude-sonnet-5-5`)
**Herramienta:** Claude Code 2.1.299 (config aislada, `CLAUDE_CONFIG_DIR=~/.claude-aislado`)
**Sesión:** la misma que el Prompt 1

```
Ahora la Parte B: bajar la regla a un test que la llame directamente, y solo la regla.

La regla vive en isOverdueOn, en backend/app/models/task.ts. Creá backend/tests/unit/ (hoy no existe) y escribí ahí backend/tests/unit/task_overdue.spec.ts, sin servidor y sin base de datos: instanciá Task en memoria, asignale dueDate y status, y llamá a isOverdueOn con un día de referencia fijo. Un test por borde:
1. Fecha anterior al día de referencia y la tarea sin hacer: vencida.
2. Fecha exactamente igual al día de referencia: no vencida.
3. Fecha posterior: no vencida.
4. Sin fecha: no vencida.
5. Tarea ya hecha con la fecha pasada: no vencida.
6. Uno que no sale de la spec: la regla tiene que dar lo mismo reciba dueDate como texto AAAA-MM-DD o como objeto de fecha. Antes de escribirlo, averiguá cómo llega dueDate de verdad cuando la tarea sale de la base y cuando sale del cuerpo de una petición, y decime con qué lo comprobaste, sin suponerlo por el tipo declarado.

Las mismas restricciones que antes:
- No toques ni una línea fuera de backend/tests/. Si un test falla, se queda en rojo.
- Nada de reloj: fechas fijas escritas en el test.
- Ni servidor ni base en estos tests. Si para instanciar Task hiciera falta conectar, decímelo antes de hacerlo.
- No commitees nada ni empujes.

Cuando esté, corré make test-unit y después make test desde la raíz. Pegame las dos últimas líneas de cada salida tal cual, y decime qué casos unitarios fallaron y con qué aserción.
```

**Qué salió:** Antes de escribir el caso 6 lo comprobó en ejecución, con un test desechable dentro de `backend/tests/` contra `db-test`, que después borró (no queda en el árbol). `dueDate` es un `string` cuando se asigna en memoria. Al leer de la base (`findOrFail`, `query`, `all`) es un `Date` de JS (`2026-08-19T00:00:00.000Z`), y `null` cuando no hay fecha. Del validador sale un `DateTime` de luxon, que el controlador reduce a texto con `toCalendarDay` antes de asignarlo. Es decir, el tipo declarado (`string | null`) no dice lo que llega de la base. Escribió `backend/tests/unit/task_overdue.spec.ts` (73 líneas): seis tests con `new Task()` en memoria, sin conectar a nada, y un helper que asigna `dueDate` con un `as string | null` para poder meterle un `Date`. `make test-unit`: `Tests  4 passed, 2 failed (6)`. Falla «una tarea hecha con la fecha pasada no está vencida» (`:47`, `expected true to be false`): con texto la comparación funciona y queda a la vista que `isOverdueOn` no mira el estado. También falla «da lo mismo reciba la fecha como texto AAAA-MM-DD o como objeto de fecha» (`:69`, `Date 2026-08-19: expected false to equal true`). Ese cae en la primera vuelta del bucle, así que los bordes igual y posterior con `Date` no llegan a ejecutarse. `make test`: `Tests  49 passed, 4 failed (53)`, con los 40 de antes en verde. El caso 6 construye el `Date` con un literal fijo (`new Date('…T00:00:00.000Z')`): no es el reloj, pero aparece si se busca `new Date` en los tests. Pedí «las dos últimas líneas» de cada salida y en Japa esas son `Time` y el `Error 1` de make, porque los totales salen antes. Lo notó y los sacó aparte. 1 min 16 s.
