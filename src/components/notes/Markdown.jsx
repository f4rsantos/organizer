import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  h1: p => <h1 className="text-xl font-bold mt-3 mb-2" {...p} />,
  h2: p => <h2 className="text-lg font-bold mt-3 mb-1.5" {...p} />,
  h3: p => <h3 className="text-base font-semibold mt-2 mb-1" {...p} />,
  p: p => <p className="my-1.5 leading-relaxed" {...p} />,
  ul: p => <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...p} />,
  ol: p => <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...p} />,
  li: p => <li className="leading-relaxed" {...p} />,
  a: p => <a className="text-primary underline" target="_blank" rel="noreferrer" {...p} />,
  blockquote: p => <blockquote className="border-l-2 border-border pl-3 my-2 text-muted-foreground italic" {...p} />,
  code: ({ inline, ...p }) => inline
    ? <code className="rounded bg-secondary px-1 py-0.5 text-[0.85em] font-mono" {...p} />
    : <code className="block rounded-lg bg-secondary p-3 text-[0.85em] font-mono overflow-x-auto" {...p} />,
  hr: () => <hr className="my-3 border-border" />,
  table: p => <div className="overflow-x-auto my-2"><table className="w-full text-sm border-collapse" {...p} /></div>,
  th: p => <th className="border border-border px-2 py-1 bg-secondary/50 text-left font-semibold" {...p} />,
  td: p => <td className="border border-border px-2 py-1" {...p} />,
}

export function Markdown({ children }) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  )
}
