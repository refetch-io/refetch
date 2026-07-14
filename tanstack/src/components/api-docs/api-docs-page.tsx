import {
  Check,
  FileJson,
  Link2,
  Lock,
  Search,
  Shield,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import openApi from '@/generated/openapi.json'
import { cn } from '@/lib/utils'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type Parameter = {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: Record<string, unknown>
  $ref?: string
}

type Operation = {
  id: string
  method: HttpMethod
  path: string
  tag: string
  summary: string
  description?: string
  security?: unknown[]
  parameters?: Parameter[]
  requestBody?: unknown
  responses?: Record<string, unknown>
  operationId?: string
}

type SchemaProperty = {
  name: string
  type: string
  required: boolean
  description: string
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  get: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  post: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  put: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  patch: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  delete: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

function resolveRef(ref: string): Record<string, unknown> | null {
  if (!ref.startsWith('#/')) return null
  const parts = ref.slice(2).split('/')
  let node: unknown = openApi
  for (const part of parts) {
    if (!node || typeof node !== 'object') return null
    node = (node as Record<string, unknown>)[part]
  }
  return node && typeof node === 'object'
    ? (node as Record<string, unknown>)
    : null
}

function resolveSchema(schema: unknown): Record<string, unknown> | null {
  if (!schema || typeof schema !== 'object') return null
  const record = schema as Record<string, unknown>
  if (typeof record.$ref === 'string') return resolveRef(record.$ref)
  if (Array.isArray(record.allOf)) {
    return record.allOf.reduce<Record<string, unknown>>((acc, part) => {
      const resolved = resolveSchema(part) ?? {}
      return {
        ...acc,
        ...resolved,
        properties: {
          ...((acc.properties as object) ?? {}),
          ...((resolved.properties as object) ?? {}),
        },
        required: [
          ...new Set([
            ...((acc.required as string[]) ?? []),
            ...((resolved.required as string[]) ?? []),
          ]),
        ],
      }
    }, {})
  }
  return record
}

function schemaLabel(refOrSchema: unknown): string {
  if (!refOrSchema || typeof refOrSchema !== 'object') return 'unknown'
  const record = refOrSchema as Record<string, unknown>
  if (typeof record.$ref === 'string') {
    return record.$ref.split('/').pop() ?? 'object'
  }
  if (Array.isArray(record.oneOf)) {
    return record.oneOf.map((part) => schemaLabel(part)).join(' | ')
  }
  if (Array.isArray(record.enum)) {
    return `enum(${record.enum.join(', ')})`
  }
  if (record.type === 'array') {
    return `array<${schemaLabel(record.items)}>`
  }
  if (typeof record.type === 'string') return record.type
  if (record.properties) return 'object'
  return 'unknown'
}

function schemaProperties(schema: unknown): SchemaProperty[] {
  const resolved = resolveSchema(schema)
  if (!resolved?.properties || typeof resolved.properties !== 'object') {
    return []
  }
  const required = new Set(
    Array.isArray(resolved.required) ? (resolved.required as string[]) : [],
  )
  return Object.entries(resolved.properties as Record<string, unknown>).map(
    ([name, prop]) => {
      const propRecord =
        prop && typeof prop === 'object'
          ? (prop as Record<string, unknown>)
          : {}
      return {
        name,
        type: schemaLabel(prop),
        required: required.has(name),
        description:
          typeof propRecord.description === 'string'
            ? propRecord.description
            : '',
      }
    },
  )
}

function collectOperations(): Operation[] {
  const paths = openApi.paths as Record<string, Record<string, unknown>>
  const ops: Operation[] = []
  for (const [path, methods] of Object.entries(paths)) {
    for (const method of Object.keys(methods) as HttpMethod[]) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
      const op = methods[method] as Record<string, unknown>
      const tags = (op.tags as string[]) ?? ['Other']
      ops.push({
        id: `${method}:${path}`,
        method,
        path,
        tag: tags[0] ?? 'Other',
        summary: String(op.summary ?? op.operationId ?? path),
        description:
          typeof op.description === 'string' ? op.description : undefined,
        security: op.security as unknown[] | undefined,
        parameters: op.parameters as Parameter[] | undefined,
        requestBody: op.requestBody,
        responses: op.responses as Record<string, unknown> | undefined,
        operationId:
          typeof op.operationId === 'string' ? op.operationId : undefined,
      })
    }
  }
  return ops
}

function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-14 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
        METHOD_STYLES[method],
        className,
      )}
    >
      {method}
    </span>
  )
}

function MetaItem({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function PropertiesTable({ properties }: { properties: SchemaProperty[] }) {
  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No properties documented.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[22%]">Name</TableHead>
          <TableHead className="w-[18%]">Type</TableHead>
          <TableHead className="w-[14%]">Required</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((property) => (
          <TableRow key={property.name}>
            <TableCell className="align-top font-mono text-xs font-medium">
              {property.name}
            </TableCell>
            <TableCell className="align-top">
              <code className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                {property.type}
              </code>
            </TableCell>
            <TableCell className="align-top text-xs">
              {property.required ? (
                <span className="font-medium text-destructive">Required</span>
              ) : (
                <span className="text-muted-foreground">Optional</span>
              )}
            </TableCell>
            <TableCell className="align-top text-muted-foreground">
              {property.description || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OperationDetail({ operation }: { operation: Operation }) {
  const [copied, setCopied] = useState(false)
  const fullPath = `/api/v1${operation.path}`
  const requiresAuth = Boolean(operation.security?.length)

  const parameters = (operation.parameters ?? []).map((param) => {
    if (param.$ref) {
      const resolved = resolveRef(param.$ref)
      return (resolved as Parameter) ?? param
    }
    return param
  })

  const requestSchema = (() => {
    const body = operation.requestBody as
      | {
          required?: boolean
          content?: {
            'application/json'?: { schema?: unknown }
          }
        }
      | undefined
    return {
      required: Boolean(body?.required),
      schema: body?.content?.['application/json']?.schema,
    }
  })()

  const responseEntries = Object.entries(operation.responses ?? {})
  const rateLimitHint = operation.description?.match(/Rate limit:[^.]+/i)?.[0]

  const copyLink = async () => {
    const url = `${window.location.origin}/docs/api#${operation.id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    setCopied(false)
  }, [operation.id])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="font-sans text-3xl font-semibold tracking-tight">
              {operation.summary}
            </h1>
            <MethodBadge method={operation.method} className="min-w-16 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Link2 data-icon="inline-start" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/openapi.json" target="_blank" rel="noreferrer">
                <FileJson data-icon="inline-start" />
                OpenAPI
              </a>
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-muted/60 px-4 py-3 font-mono text-sm ring-1 ring-foreground/10">
          <span className="mr-3 font-bold tracking-wide text-muted-foreground uppercase">
            {operation.method}
          </span>
          <span>{fullPath}</span>
        </div>

        {operation.description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {operation.description}
          </p>
        ) : null}

        <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-3">
          <MetaItem label="Authentication" icon={<Shield className="size-3.5" />}>
            {requiresAuth ? (
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                API key
              </span>
            ) : (
              'None'
            )}
          </MetaItem>
          <MetaItem label="Content type" icon={<FileJson className="size-3.5" />}>
            application/json
          </MetaItem>
          <MetaItem label="Rate limit" icon={<Zap className="size-3.5" />}>
            {rateLimitHint?.replace(/^Rate limit:\s*/i, '') ?? 'See description'}
          </MetaItem>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={['request', 'responses']}
        className="rounded-xl border border-border/70 px-4"
      >
        <AccordionItem value="request">
          <AccordionTrigger className="font-sans text-base font-semibold hover:no-underline">
            Request
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Parameters</h3>
              {parameters.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[22%]">Name</TableHead>
                      <TableHead className="w-[12%]">In</TableHead>
                      <TableHead className="w-[18%]">Type</TableHead>
                      <TableHead className="w-[14%]">Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.map((param) => (
                      <TableRow key={`${param.in}:${param.name}`}>
                        <TableCell className="align-top font-mono text-xs font-medium">
                          {param.name}
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {param.in}
                        </TableCell>
                        <TableCell className="align-top">
                          <code className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                            {schemaLabel(param.schema)}
                          </code>
                        </TableCell>
                        <TableCell className="align-top text-xs">
                          {param.required ? (
                            <span className="font-medium text-destructive">
                              Required
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Optional
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {param.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No path or query parameters.
                </p>
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Request body</h3>
                {requestSchema.schema ? (
                  <>
                    <Badge variant="secondary">application/json</Badge>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {schemaLabel(requestSchema.schema)}
                    </code>
                    {requestSchema.required ? (
                      <span className="text-xs font-medium text-destructive">
                        Required
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              {requestSchema.schema ? (
                <PropertiesTable
                  properties={schemaProperties(requestSchema.schema)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This operation does not accept a request body.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="responses">
          <AccordionTrigger className="font-sans text-base font-semibold hover:no-underline">
            Responses
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%]">Status code</TableHead>
                  <TableHead className="w-[24%]">Content type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responseEntries.map(([status, response]) => {
                  const resolved =
                    response &&
                    typeof response === 'object' &&
                    '$ref' in response &&
                    typeof (response as { $ref: string }).$ref === 'string'
                      ? resolveRef((response as { $ref: string }).$ref)
                      : (response as Record<string, unknown>)
                  const description =
                    typeof resolved?.description === 'string'
                      ? resolved.description
                      : ''
                  const hasJson = Boolean(
                    (
                      resolved?.content as
                        | { 'application/json'?: unknown }
                        | undefined
                    )?.['application/json'],
                  )

                  return (
                    <TableRow key={status}>
                      <TableCell className="align-top font-mono text-xs font-semibold">
                        {status}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {hasJson ? 'application/json' : '-'}
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {description || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {responseEntries.map(([status, response]) => {
              const resolved =
                response &&
                typeof response === 'object' &&
                '$ref' in response &&
                typeof (response as { $ref: string }).$ref === 'string'
                  ? resolveRef((response as { $ref: string }).$ref)
                  : (response as Record<string, unknown>)
              const schema = (
                resolved?.content as
                  | { 'application/json'?: { schema?: unknown } }
                  | undefined
              )?.['application/json']?.schema
              if (!schema) return null
              const properties = schemaProperties(schema)
              if (properties.length === 0) return null

              return (
                <div key={`${status}-schema`} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      Response model ({status})
                    </h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {schemaLabel(schema)}
                    </code>
                  </div>
                  <PropertiesTable properties={properties} />
                </div>
              )
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function ApiDocsPage() {
  const operations = useMemo(() => collectOperations(), [])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return operations[0]?.id ?? ''
    const hash = window.location.hash.replace(/^#/, '')
    return operations.some((op) => op.id === hash)
      ? hash
      : (operations[0]?.id ?? '')
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return operations
    return operations.filter(
      (op) =>
        op.summary.toLowerCase().includes(q) ||
        op.path.toLowerCase().includes(q) ||
        op.method.includes(q) ||
        op.tag.toLowerCase().includes(q) ||
        (op.operationId ?? '').toLowerCase().includes(q),
    )
  }, [operations, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Operation[]>()
    for (const op of filtered) {
      const list = map.get(op.tag) ?? []
      list.push(op)
      map.set(op.tag, list)
    }
    return map
  }, [filtered])

  const selected =
    operations.find((op) => op.id === selectedId) ??
    filtered[0] ??
    operations[0]

  useEffect(() => {
    if (!selected) return
    if (window.location.hash !== `#${selected.id}`) {
      window.history.replaceState(null, '', `#${selected.id}`)
    }
  }, [selected])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:flex-row">
      <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-border md:max-h-none md:w-[300px] md:border-r md:border-b-0 lg:w-[320px]">
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Methods</p>
              <p className="truncate text-xs text-muted-foreground">
                OpenAPI {openApi.openapi} · v{openApi.info.version}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden shrink-0 sm:inline-flex"
            >
              <a href="/openapi.json" download>
                <FileJson data-icon="inline-start" />
                Spec
              </a>
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search methods..."
              className="pl-8"
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            {filtered.length} method{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 p-3 pb-6">
            {[...grouped.entries()].map(([tag, ops]) => (
              <div key={tag} className="flex flex-col gap-1">
                <p className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {tag}
                </p>
                {ops.map((op) => {
                  const active = selected?.id === op.id
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedId(op.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      <MethodBadge method={op.method} />
                      <span className="truncate font-mono text-xs">
                        {op.path}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
            {filtered.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No methods match your search.
              </p>
            ) : null}
          </nav>
        </ScrollArea>

        <div className="border-t border-border p-3 sm:hidden">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href="/openapi.json" download>
              <FileJson data-icon="inline-start" />
              OpenAPI spec
            </a>
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
          {selected ? <OperationDetail operation={selected} /> : null}
        </div>
      </main>
    </div>
  )
}
