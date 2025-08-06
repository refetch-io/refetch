"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Monitor, Briefcase, Link as LinkIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function SubmitPage() {
  const [activeTab, setActiveTab] = useState("link")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    company: "",
    location: "",
    salary: "",
    type: "link"
  })
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check authentication when user tries to submit
    if (loading) {
      alert('Please wait while we check your authentication status...')
      return
    }
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = "https://refetch.authui.site/"
      return
    }

    setIsSubmitting(true)

    try {
      // Get JWT from client
      const { account } = await import('@/lib/appwrite')
      const session = await account.getSession('current')
      // @ts-ignore - Appwrite session structure
      const jwt = session.providerToken || session.jwt

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          ...formData,
          type: activeTab
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Redirect to the submitted post
        router.push(`/threads/${result.postId}`)
      } else {
        const error = await response.json()
        alert(`Error submitting post: ${error.message}`)
      }
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Error submitting post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't show loading screen for static form - just render the form immediately
  // Authentication will be checked when user tries to submit

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4 mt-1">
      {/* Main Content */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Link
              </TabsTrigger>
              <TabsTrigger value="show" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Show
              </TabsTrigger>
              <TabsTrigger value="job" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Job
              </TabsTrigger>
            </TabsList>

            {/* Link Tab */}
            <TabsContent value="link" className="mt-6">
              <div className="bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Submit a Link</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter the title of your post"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">URL *</Label>
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Add a brief description or context"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Link"}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>

            {/* Show Tab */}
            <TabsContent value="show" className="mt-6">
              <div className="bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Submit a Show</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="show-title">Title *</Label>
                      <Input
                        id="show-title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="What are you showing?"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="show-url">URL (optional)</Label>
                      <Input
                        id="show-url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="show-description">Description *</Label>
                      <Textarea
                        id="show-description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Tell us about what you're showing"
                        rows={4}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Show"}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>

            {/* Job Tab */}
            <TabsContent value="job" className="mt-6">
              <div className="bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Submit a Job</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="job-title">Job Title *</Label>
                      <Input
                        id="job-title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., Senior Software Engineer"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company *</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Company name"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="e.g., Remote, San Francisco"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salary">Salary Range</Label>
                        <Input
                          id="salary"
                          value={formData.salary}
                          onChange={(e) => handleInputChange('salary', e.target.value)}
                          placeholder="e.g., $100k-$150k"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="job-url">Application URL *</Label>
                      <Input
                        id="job-url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://company.com/careers/job"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="job-description">Job Description</Label>
                      <Textarea
                        id="job-description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Brief description of the role and requirements"
                        rows={4}
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Job"}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
} 