import { Check, Copy, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api/client'
import type { ApiKey, CreatedApiKey } from '@/lib/types'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.listApiKeys()
      setKeys(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createKey = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    setCreated(null)
    try {
      const key = await api.createApiKey(name.trim() || 'API key')
      setCreated(key)
      setName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (keyId: string) => {
    setRevokingId(keyId)
    setError('')
    try {
      await api.deleteApiKey(keyId)
      if (created?.id === keyId) setCreated(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key')
    } finally {
      setRevokingId(null)
    }
  }

  const copySecret = async () => {
    if (!created?.secret) return
    await navigator.clipboard.writeText(created.secret)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {created ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Copy your new key now. For security, it will not be shown again.
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
                {created.secret}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copySecret}
              >
                {copied ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create key</CardTitle>
          <CardDescription>
            Send as{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              Authorization: Bearer rfk_…
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createKey}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="api-key-name">Key name</FieldLabel>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="CI bot, personal script..."
                  maxLength={128}
                />
                <FieldDescription>
                  A label so you can tell keys apart later.
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={creating}>
                {creating ? <Spinner data-icon="inline-start" /> : null}
                Create API key
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
          <CardDescription>
            Secrets are shown once at creation. Revoke any key you no longer
            need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {key.prefix}_…
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Created {formatDate(key.createdAt)} · Last used{' '}
                      {formatDate(key.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                    disabled={revokingId === key.id}
                    onClick={() => void revokeKey(key.id)}
                  >
                    {revokingId === key.id ? <Spinner /> : <Trash2 />}
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** @deprecated Use ApiKeysSection */
export const ApiKeysCard = ApiKeysSection
