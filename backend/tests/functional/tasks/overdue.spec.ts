import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cuándo una tarea está vencida. Un test por cada Scenario del requisito «Cuándo una
 * tarea está vencida» de `openspec/specs/tasks/spec.md`, titulado igual que él.
 *
 * Todo entra por HTTP y se afirma sobre el `isOverdue` del cuerpo de la respuesta. Las
 * tareas se montan solo con la API, tal y como las monta el cliente: `POST /tasks` las
 * crea (sin fecha y pendientes), `PUT /tasks/:id/due-date` les pone fecha y
 * `PATCH /tasks/:id/status` les cambia el estado.
 *
 * El endpoint que se lee es `GET /tasks/:id`: es el único que informa de `isOverdue` al
 * consultar (la lista no lo lleva, a propósito). Los dos Scenarios que hablan de «la
 * misma respuesta de ese cambio» se leen además en la respuesta del propio `PUT`.
 *
 * Ningún día sale de un reloj: el día de referencia y las fechas de vencimiento están
 * escritos aquí, y el día de referencia viaja en `today`.
 */
test.group('Tasks | vencimiento', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // El día desde el que se mira. Las fechas de cada test se escriben respecto a él.
  const HOY = '2026-08-20'

  async function persona(client: any) {
    await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: 'ada@example.com', password: 'secreto123' })

    return { Authorization: `Bearer ${login.body().data.token as string}` }
  }

  /** Crea una tarea (sin fecha y pendiente) y devuelve el id que le da la creación. */
  async function crearTarea(client: any, auth: Record<string, string>) {
    const creada = await client.post('/api/v1/tasks').headers(auth).json({ title: 'Entregar' })
    creada.assertStatus(201)

    return creada.body().data.id as number
  }

  /** Pone o cambia la fecha de vencimiento y devuelve la respuesta de ese cambio. */
  async function fijarFecha(
    client: any,
    auth: Record<string, string>,
    id: number,
    dueDate: string,
    today = HOY
  ) {
    const response = await client
      .put(`/api/v1/tasks/${id}/due-date`)
      .headers(auth)
      .json({ dueDate, today })
    response.assertStatus(200)

    return response
  }

  async function cambiarEstado(
    client: any,
    auth: Record<string, string>,
    id: number,
    status: string
  ) {
    const response = await client.patch(`/api/v1/tasks/${id}/status`).headers(auth).json({ status })
    response.assertStatus(200)
  }

  /** La tarea tal y como la ve quien la consulta desde ese día. */
  async function consultar(client: any, auth: Record<string, string>, id: number, today = HOY) {
    const response = await client.get(`/api/v1/tasks/${id}`).qs({ today }).headers(auth)
    response.assertStatus(200)

    return response.body().data
  }

  test('Fecha del día anterior', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    await fijarFecha(client, auth, id, '2026-08-19')

    const tarea = await consultar(client, auth, id)

    assert.equal(tarea.status, 'pending')
    assert.isTrue(tarea.isOverdue)
  })

  test('Vencer hoy todavía no es estar vencida', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    await fijarFecha(client, auth, id, '2026-08-20')

    const tarea = await consultar(client, auth, id)

    assert.equal(tarea.status, 'pending')
    assert.isFalse(tarea.isOverdue)
  })

  test('Fecha futura', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    await fijarFecha(client, auth, id, '2026-08-21')

    const tarea = await consultar(client, auth, id)

    assert.isFalse(tarea.isOverdue)
  })

  test('Sin fecha no se vence nunca', async ({ client, assert }) => {
    // «Creada hace semanas» no se puede montar por la API: `createdAt` lo pone el
    // servidor al crear y ningún endpoint lo acepta. Lo que sí se controla es el día de
    // referencia, así que la antigüedad se consigue mirándola desde un día muy posterior
    // a su creación, sea cual sea el día en que se corra el test.
    const MUCHO_DESPUES = '2100-01-01'
    const auth = await persona(client)
    const id = await crearTarea(client, auth)

    const tarea = await consultar(client, auth, id, MUCHO_DESPUES)

    assert.isNull(tarea.dueDate)
    assert.equal(tarea.status, 'pending')
    assert.isFalse(tarea.isOverdue)
  })

  test('Darla por hecha la deja de vencer', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    await fijarFecha(client, auth, id, '2026-08-10')

    const antes = await consultar(client, auth, id)
    assert.isTrue(antes.isOverdue)

    await cambiarEstado(client, auth, id, 'done')

    const despues = await consultar(client, auth, id)
    assert.equal(despues.status, 'done')
    assert.isFalse(despues.isOverdue)
    // La fecha no se toca al darla por hecha: sigue siendo la misma de antes.
    assert.equal(despues.dueDate, antes.dueDate)
  })

  test('Una tarea hecha con la fecha pasada', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    await fijarFecha(client, auth, id, '2026-08-10')
    await cambiarEstado(client, auth, id, 'done')

    const tarea = await consultar(client, auth, id)

    assert.equal(tarea.status, 'done')
    assert.isFalse(tarea.isOverdue)
  })

  test('Aplazar resuelve el vencimiento', async ({ client, assert }) => {
    const auth = await persona(client)
    const id = await crearTarea(client, auth)
    const vencida = await fijarFecha(client, auth, id, '2026-08-10')
    assert.isTrue(vencida.body().data.isOverdue)

    // La respuesta del propio cambio, no una consulta posterior.
    const aplazada = await fijarFecha(client, auth, id, '2026-08-25')

    assert.equal(aplazada.body().data.dueDate, '2026-08-25')
    assert.isFalse(aplazada.body().data.isOverdue)
  })
})
