import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'

function cardTask(id, order, over = {}) {
  return {
    id,
    title: id,
    done: false,
    semesterId: 'sem1',
    views: { kanban: true },
    kanban: { columnId: 'col_todo', order },
    ...over,
  }
}

async function freshStore() {
  const { useStore } = await import('../../src/store/useStore.js')
  useStore.setState({
    tasks: [cardTask('a', 0), cardTask('b', 1), cardTask('c', 2)],
    kanban: {
      sem1: {
        columns: [
          { id: 'col_todo', title: 'To Do', order: 0 },
          { id: 'col_done', title: 'Done', order: 1 },
        ],
      },
    },
  })
  return useStore
}

const orderOf = (store, id) => store.getState().tasks.find(t => t.id === id).kanban.order

describe('reorderKanbanCards', () => {
  it('renumbers cards to match the given id order', async () => {
    const store = await freshStore()
    store.getState().reorderKanbanCards('sem1', 'col_todo', ['c', 'a', 'b'])
    expect(orderOf(store, 'c')).toBe(0)
    expect(orderOf(store, 'a')).toBe(1)
    expect(orderOf(store, 'b')).toBe(2)
  })

  it('leaves cards outside the given list untouched', async () => {
    const store = await freshStore()
    store.getState().reorderKanbanCards('sem1', 'col_todo', ['b', 'a'])
    expect(orderOf(store, 'c')).toBe(2)
  })

  it('marks cards done when reordered into the done column', async () => {
    const store = await freshStore()
    store.getState().reorderKanbanCards('sem1', 'col_done', ['a'])
    const a = store.getState().tasks.find(t => t.id === 'a')
    expect(a.done).toBe(true)
    expect(a.kanban.columnId).toBe('col_done')
  })
})

describe('done column keeps the order cards were finished in', () => {
  const doneOrder = store => store.getState().tasks
    .filter(t => t.kanban.columnId === 'col_done')
    .sort((x, y) => x.kanban.order - y.kanban.order)
    .map(t => t.id)

  it('puts each card ticked off at the bottom of done', async () => {
    const store = await freshStore()
    store.getState().toggleTask('c')
    store.getState().toggleTask('a')
    store.getState().toggleTask('b')
    expect(doneOrder(store)).toEqual(['c', 'a', 'b'])
  })

  it('puts a card moved into done at the bottom', async () => {
    const store = await freshStore()
    store.getState().moveKanbanCard('sem1', 'c', 'col_done')
    store.getState().moveKanbanCard('sem1', 'a', 'col_done')
    expect(doneOrder(store)).toEqual(['c', 'a'])
  })

  it('puts a reopened card at the bottom of to do', async () => {
    const store = await freshStore()
    store.getState().toggleTask('a')
    store.getState().toggleTask('a')
    const todo = store.getState().tasks.filter(t => t.kanban.columnId === 'col_todo')
      .sort((x, y) => x.kanban.order - y.kanban.order).map(t => t.id)
    expect(todo).toEqual(['b', 'c', 'a'])
  })
})
