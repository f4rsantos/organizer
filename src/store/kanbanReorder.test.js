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
  const { useStore } = await import('./useStore.js')
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
