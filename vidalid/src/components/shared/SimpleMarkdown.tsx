import { Fragment, type ReactNode } from 'react'

/** **negrita** dentro de una línea (sin HTML: todo se renderiza como texto seguro). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

/**
 * Markdown mínimo para respuestas del asistente: párrafos, títulos (#), listas
 * con viñetas o números y **negrita**. No interpreta HTML (evita inyección).
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushList = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={`l${blocks.length}`} className={list.ordered ? 'my-1.5 list-decimal space-y-0.5 pl-5' : 'my-1.5 list-disc space-y-0.5 pl-5'}>
        {list.items.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,4}\s+(.*)$/)

    if (bullet || numbered) {
      const ordered = !!numbered
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
      continue
    }
    flushList()
    if (!line.trim()) continue
    if (heading) {
      blocks.push(
        <p key={`h${blocks.length}`} className="mt-2 font-semibold">
          {inline(heading[1])}
        </p>,
      )
    } else {
      blocks.push(
        <p key={`p${blocks.length}`} className="my-1">
          {inline(line)}
        </p>,
      )
    }
  }
  flushList()

  return <div className="text-sm leading-relaxed">{blocks}</div>
}
