"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus } from "lucide-react"
import { account } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"
import Link from "next/link"

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
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

  const handleChange = (field: string, value: string) => {
    setSignUpData(prev => ({
      ...prev,
      [field]: value
    }))
    setError("")
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

      // Show success message
      setSuccess(true)
      
      // Automatically sign in after successful registration
      await account.createEmailPasswordSession(signUpData.email, signUpData.password)
      await refreshUser() // Refresh auth context before redirect
      
      // Redirect to home page
      setTimeout(() => {
        router.push("/")
      }, 1000)
      
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
        <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4" />
              <h3 className="font-normal text-gray-900 font-heading text-sm">Create New Account</h3>
            </div>
            <div className="h-px bg-gray-100 mb-4 -mx-4" />
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                Account created successfully! Signing you in...
              </div>
            )}
            
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Name *</Label>
                <Input
                  id="name"
                  value={signUpData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={signUpData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={signUpData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Create a password (min 8 characters)"
                  required
                  minLength={8}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">Confirm Password *</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="text-sm"
                />
              </div>
              <Button type="submit" disabled={isLoading || success} className="w-full">
                {success ? "Account Created!" : "Create Account"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
