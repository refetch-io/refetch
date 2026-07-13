import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { account, ID } from '@/lib/appwrite-web'
import { useAuth } from '@/contexts/auth-context'

export const Route = createFileRoute('/_app/signin')({
  component: SignInPage,
  head: () => ({
    meta: [{ title: 'Sign in — Refetch' }],
  }),
})

function SignInPage() {
  const [activeTab, setActiveTab] = useState('signin')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const { isAuthenticated, refreshUser, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: '/' })
  }, [isAuthenticated, loading, navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await account.createEmailPasswordSession({
        email: signInData.email,
        password: signInData.password,
      })
      await refreshUser()
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (signUpData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await account.create({
        userId: ID.unique(),
        email: signUpData.email,
        password: signUpData.password,
        name: signUpData.name,
      })
      await account.createEmailPasswordSession({
        email: signUpData.email,
        password: signUpData.password,
      })
      await refreshUser()
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Refetch</CardTitle>
          <CardDescription>
            Sign in to vote, comment, and submit stories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      value={signInData.email}
                      onChange={(e) =>
                        setSignInData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signin-password">Password</FieldLabel>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    Sign in
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                    <Input
                      id="signup-name"
                      required
                      value={signUpData.name}
                      onChange={(e) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={signUpData.email}
                      onChange={(e) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                    <FieldDescription>At least 8 characters.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-confirm">
                      Confirm password
                    </FieldLabel>
                    <Input
                      id="signup-confirm"
                      type="password"
                      required
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    Create account
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Prefer a dedicated page?{' '}
          <Link to="/signup" className="ml-1 text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
