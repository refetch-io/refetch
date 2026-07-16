import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api/client'
import type { ApiKey, CreatedApiKey } from '@/lib/types'

const CREATE_KEY_FORM_ID = 'create-api-key-form'

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
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [createError, setCreateError] = useState('')

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

  const openCreate = () => {
    setCreateError('')
    setName('')
    setCreateOpen(true)
  }

  const createKey = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreated(null)
    try {
      const key = await api.createApiKey(name.trim() || 'API key')
      setCreated(key)
      setName('')
      setCreateOpen(false)
      await load()
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create API key',
      )
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
    <div className="flex flex-col gap-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {created ? (
        <Alert>
          <KeyRound />
          <AlertTitle>Copy your new key now</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>For security, it will not be shown again.</span>
            <InputGroup className="h-9 bg-muted/50">
              <InputGroupInput
                readOnly
                value={created.secret}
                className="font-mono text-[11px]"
                aria-label="New API key secret"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="sm"
                  variant="secondary"
                  onClick={copySecret}
                  aria-label={copied ? 'Copied' : 'Copy API key'}
                >
                  {copied ? (
                    <Check data-icon="inline-start" />
                  ) : (
                    <Copy data-icon="inline-start" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
          <CardDescription>
            Secrets are shown once at creation. Revoke any key you no longer
            need. Send as{' '}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
              Authorization: Bearer rfk_…
            </code>
          </CardDescription>
          <CardAction>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Create key
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center">
              <KeyRound className="size-5 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No API keys yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Create a key to authenticate requests to the Refetch API.
                </p>
              </div>
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Create key
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 transition-colors hover:bg-muted/35"
                >
                  <div className="min-w-0 flex flex-col gap-1">
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
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-destructive"
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setCreateError('')
            setName('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Choose a label so you can tell keys apart later. The secret is
              shown only once.
            </DialogDescription>
          </DialogHeader>

          {createError ? (
            <Alert variant="destructive">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          ) : null}

          <form id={CREATE_KEY_FORM_ID} onSubmit={createKey}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="api-key-name">Key name</FieldLabel>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="CI bot, personal script..."
                  maxLength={128}
                  autoFocus
                />
                <FieldDescription>
                  Optional. Defaults to “API key”.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={CREATE_KEY_FORM_ID}
              disabled={creating}
            >
              {creating ? <Spinner data-icon="inline-start" /> : null}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** @deprecated Use ApiKeysSection */
export const ApiKeysCard = ApiKeysSection
