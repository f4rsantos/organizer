import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLocalStorage } from '../helpers/testStorage.js'

const NOW = new Date('2026-10-18T09:00:00')

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function cli() {
  const { useStore } = await import('../../src/store/useStore.js')
  const { runCli } = await import('../../src/cli/commands.js')
  useStore.setState({ hydrated: true, lang: 'en', settings: { ...useStore.getState().settings, semesterMode: 'none' } })
  let last = null
  const files = {}
  const lines = []
  const env = {
    store: useStore,
    now: () => NOW,
    print: line => lines.push(line),
    lastAction: { get: () => last, set: value => { last = value } },
    readFile: path => files[path],
    writeFile: (path, text) => { files[path] = text },
  }
  const run = async (...argv) => {
    lines.length = 0
    const code = await runCli(argv, env)
    return { code, output: lines.join('\n') }
  }
  return { useStore, run, files }
}

describe('organizer cli', () => {
  it('turns free text into a task', async () => {
    const { useStore, run } = await cli()
    const { code, output } = await run('add', 'task', 'essay', 'tomorrow')
    expect(code).toBe(0)
    expect(output).toContain('essay')
    expect(useStore.getState().tasks.map(t => [t.title, t.dueDate])).toEqual([['essay', '2026-10-19']])
  })

  it('previews without changing anything on a dry run', async () => {
    const { useStore, run } = await cli()
    const { output } = await run('add', 'event', 'dentist', 'friday', 'at', '3pm', '--dry-run')
    expect(output).toContain('dentist')
    expect(output).toContain('15:00')
    expect(useStore.getState().events).toEqual([])
  })

  it('undoes the previous command from a separate invocation', async () => {
    const { useStore, run } = await cli()
    await run('add', 'task', 'call', 'mum')
    await run('undo')
    expect(useStore.getState().tasks).toEqual([])
  })

  it('shows today on the agenda with event times', async () => {
    const { run } = await cli()
    await run('add', 'event', 'standup', 'today', 'at', '10am')
    const { output } = await run('today')
    expect(output).toContain('Today')
    expect(output).toMatch(/10:00\s+● standup/)
  })

  it('prints machine-readable output with --json', async () => {
    const { run } = await cli()
    await run('add', 'task', 'read', 'today')
    const { output } = await run('tasks', '--json')
    expect(JSON.parse(output).map(t => t.title)).toEqual(['read'])
  })

  it('applies a natural-language settings change', async () => {
    const { useStore, run } = await cli()
    await run('settings', 'dark', 'mode')
    expect(useStore.getState().theme).toBe('dark')
  })

  it('round-trips data through export and import', async () => {
    const { useStore, run } = await cli()
    await run('add', 'task', 'keep', 'me')
    await run('export', 'backup.json')
    useStore.setState({ tasks: [] })
    await run('import', 'backup.json')
    expect(useStore.getState().tasks.map(t => t.title)).toEqual(['keep me'])
  })

  it('reports failure when the text means nothing', async () => {
    const { run } = await cli()
    expect((await run('   ')).code).toBe(1)
  })
})
