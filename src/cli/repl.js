import readline from 'node:readline'
import { getStrings } from '../lib/strings/index.js'

const EXIT_WORDS = new Set(['exit', 'quit', ':q'])

export function splitArgs(line) {
  return line.trim().split(/\s+/).filter(Boolean)
}

export function startRepl({ env, runCli, onChange, input = process.stdin, output = process.stdout }) {
  const t = () => getStrings(env.store.getState().lang ?? 'en')
  const rl = readline.createInterface({ input, output, prompt: env.paint.cyan('› '), historySize: 200 })
  env.print(`${env.paint.bold('organizer')} ${env.paint.dim(t().cliReplHint)}`)
  rl.prompt()
  rl.on('line', async line => {
    const args = splitArgs(line)
    if (EXIT_WORDS.has(args[0])) { rl.close(); return }
    if (args.length) {
      env.changed = false
      await runCli(args, env)
      if (env.changed) await onChange()
    }
    rl.prompt()
  })
  return new Promise(resolve => rl.on('close', resolve))
}
