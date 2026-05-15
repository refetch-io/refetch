"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function SubmitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
  })
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) {
      alert("Please wait while we check your authentication status...")
      return
    }

    if (!isAuthenticated || !user?.$id) {
      router.push("/signin")
      return
    }

    setIsSubmitting(true)

    try {
      const { getCachedJWT } = await import("@/lib/jwtCache")
      const jwt = await getCachedJWT()

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          ...formData,
          type: "link",
        }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/threads/${result.postId}`)
      } else {
        const error = await response.json()
        alert(`Error submitting post: ${error.message}`)
      }
    } catch (error) {
      console.error("Error submitting post:", error)
      alert("Error submitting post. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4">
      <main className="flex-1 space-y-6 min-w-0 pb-[50px]">
        <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Submit link</h3>
            <div className="h-px bg-gray-100 mb-4 -mx-4" />
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter the title of your post"
                  required
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm">
                  URL *
                </Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange("url", e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">
                  Comment (optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Start a discussion..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
