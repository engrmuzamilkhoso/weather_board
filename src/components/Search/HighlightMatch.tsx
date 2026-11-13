/** Bolds the part of `text` that starts with what the user typed. */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  const needle = (query.split(',')[0] ?? '').trim()
  const index = needle ? text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase()) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  )
}
