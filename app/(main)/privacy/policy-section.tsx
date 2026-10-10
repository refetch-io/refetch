export function PolicySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-gray-700 leading-6">{children}</div>
    </section>
  )
}

export function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
