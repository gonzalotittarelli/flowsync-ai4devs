import Task from '#models/task'
import { test } from '@japa/runner'

/**
 * La regla de «vencida» (`Task.isOverdueOn`) sola: sin servidor, sin base de datos y sin
 * pasar por ningún transformer. La tarea se instancia en memoria y no se guarda.
 *
 * Es la misma regla que ejercen los Scenarios de `tests/functional/tasks/overdue.spec.ts`,
 * pero aquí cada borde se prueba sin que nada entre medias pueda enmascararlo.
 *
 * Ningún día sale de un reloj: el día de referencia y las fechas están escritos aquí.
 */
test.group('Task | isOverdueOn', () => {
  const HOY = '2026-08-20'

  /**
   * `dueDate` se declara `string | null`, pero eso es solo el tipo: de la base llega un
   * `Date` (ver el último test). Por eso se acepta aquí cualquier cosa y se asigna sin
   * que el compilador la mire.
   */
  function tarea(dueDate: unknown, status: Task['status'] = 'pending'): Task {
    const task = new Task()
    task.dueDate = dueDate as string | null
    task.status = status

    return task
  }

  test('una fecha anterior al día de referencia, sin hacer, está vencida', ({ assert }) => {
    assert.isTrue(tarea('2026-08-19').isOverdueOn(HOY))
    assert.isTrue(tarea('2026-08-19', 'in_progress').isOverdueOn(HOY))
  })

  test('una fecha igual al día de referencia no está vencida', ({ assert }) => {
    assert.isFalse(tarea('2026-08-20').isOverdueOn(HOY))
  })

  test('una fecha posterior al día de referencia no está vencida', ({ assert }) => {
    assert.isFalse(tarea('2026-08-21').isOverdueOn(HOY))
  })

  test('sin fecha no está vencida', ({ assert }) => {
    assert.isFalse(tarea(null).isOverdueOn(HOY))
  })

  test('una tarea hecha con la fecha pasada no está vencida', ({ assert }) => {
    assert.isFalse(tarea('2026-08-10', 'done').isOverdueOn(HOY))
  })

  test('da lo mismo reciba la fecha como texto AAAA-MM-DD o como objeto de fecha', ({
    assert,
  }) => {
    // Lo que de verdad entrega la base: `Task.findOrFail`, `Task.query` y `Task.all`
    // devuelven `dueDate` como un `Date` en la medianoche UTC del día (comprobado contra
    // `db-test`), no como el texto que declara el tipo. Un `Date` fijo, sin reloj.
    const comoLaBase = (dia: string) => new Date(`${dia}T00:00:00.000Z`)

    const casos = [
      { dia: '2026-08-19', vencida: true },
      { dia: '2026-08-20', vencida: false },
      { dia: '2026-08-21', vencida: false },
    ]

    for (const { dia, vencida } of casos) {
      const comoTexto = tarea(dia).isOverdueOn(HOY)
      const comoFecha = tarea(comoLaBase(dia)).isOverdueOn(HOY)

      assert.equal(comoTexto, vencida, `texto ${dia}`)
      assert.equal(comoFecha, vencida, `Date ${dia}`)
      assert.equal(comoFecha, comoTexto, `texto y Date de ${dia} deberían coincidir`)
    }
  })
})
