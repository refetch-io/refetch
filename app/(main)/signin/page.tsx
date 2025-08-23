"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn, UserPlus } from "lucide-react"
import { account } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("signin")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  })
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const { isAuthenticated, refreshUser } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  const handleSignInChange = (field: string, value: string) => {
    setSignInData(prev => ({
      ...prev,
      [field]: value
    }))
    setError("")
  }

  const handleSignUpChange = (field: string, value: string) => {
    setSignUpData(prev => ({
      ...prev,
      [field]: value
    }))
    setError("")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await account.createEmailPasswordSession(signInData.email, signInData.password)
      await refreshUser() // Refresh auth context before redirect
      router.push("/")
    } catch (error: any) {
      console.error('Sign in error:', error)
      setError(error.message || "Failed to sign in. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (signUpData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Create account
      await account.create(
        'unique()', // Let Appwrite generate unique ID
        signUpData.email,
        signUpData.password,
        signUpData.name
      )

      // Automatically sign in after successful registration
      await account.createEmailPasswordSession(signUpData.email, signUpData.password)
      await refreshUser() // Refresh auth context before redirect
      router.push("/")
    } catch (error: any) {
      console.error('Sign up error:', error)
      setError(error.message || "Failed to create account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4 mt-1">
      {/* Main Content */}
      <main className="flex-1 space-y-6 min-w-0 pb-[50px]">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-2 shadow-none p-0 gap-2">
            <TabsTrigger value="signin" className="flex items-center justify-center gap-2 bg-gray-50 data-[state=active]:bg-white data-[state=active]:shadow-none rounded-lg">
              <LogIn className="w-4 h-4 -ml-2" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center justify-center gap-2 bg-gray-50 data-[state=active]:bg-white data-[state=active]:shadow-none rounded-lg">
              <UserPlus className="w-4 h-4 -ml-2" />
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="mt-4">
            <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Sign In to Your Account</h3>
                <div className="h-px bg-gray-100 mb-4 -mx-4" />
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm">Email *</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => handleSignInChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm">Password *</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => handleSignInChange('password', e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="text-sm"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    Sign In
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signup")}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup" className="mt-4">
            <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Create New Account</h3>
                <div className="h-px bg-gray-100 mb-4 -mx-4" />
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">Name *</Label>
                    <Input
                      id="signup-name"
                      value={signUpData.name}
                      onChange={(e) => handleSignUpChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => handleSignUpChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpData.password}
                      onChange={(e) => handleSignUpChange('password', e.target.value)}
                      placeholder="Create a password (min 8 characters)"
                      required
                      minLength={8}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-sm">Confirm Password *</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => handleSignUpChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className="text-sm"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    Create Account
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("signin")}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
