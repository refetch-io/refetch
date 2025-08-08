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
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [submittedPostId, setSubmittedPostId] = useState<string | null>(null)
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
    
    if (!isAuthenticated || !user?.$id) {
      // Redirect to login if not authenticated
      router.push("/login")
      return
    }

    setIsSubmitting(true)
    setIsAnalyzing(true)

    try {
      // Get JWT token for authentication
      const { getCachedJWT } = await import('@/lib/jwtCache')
      const jwt = await getCachedJWT()

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
        setSubmittedPostId(result.postId)
        // Don't redirect immediately, show metadata first
      } else {
        const error = await response.json()
        alert(`Error submitting post: ${error.message}`)
      }
    } catch (error) {
      console.error('Error submitting post:', error)
      alert('Error submitting post. Please try again.')
    } finally {
      setIsSubmitting(false)
      setIsAnalyzing(false)
    }
  }

  const handleViewPost = () => {
    if (submittedPostId) {
      router.push(`/threads/${submittedPostId}`)
    }
  }

  const handleSubmitAnother = () => {
    setSubmittedPostId(null)
    setFormData({
      title: "",
      url: "",
      description: "",
      company: "",
      location: "",
      salary: "",
      type: "link"
    })
    setActiveTab("link")
  }

  // Show success message if post was submitted successfully
  if (submittedPostId) {
    return (
      <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4 mt-1">
        <main className="flex-1 space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Post Submitted Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Your post has been submitted and analyzed. Here are the results:
              </p>
              

              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleViewPost} className="flex-1">
                  View Post
                </Button>
                <Button onClick={handleSubmitAnother} variant="outline" className="flex-1">
                  Submit Another Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Don't show loading screen for static form - just render the form immediately
  // Authentication will be checked when user tries to submit

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4 mt-1">
      {/* Main Content */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-3 shadow-none p-0 gap-2">
                                        <TabsTrigger value="link" className="flex items-center justify-center gap-2 bg-gray-50 data-[state=active]:bg-white data-[state=active]:shadow-none rounded-lg">
                <LinkIcon className="w-4 h-4 -ml-2" />
                Link
              </TabsTrigger>
                                        <TabsTrigger value="show" className="flex items-center justify-center gap-2 bg-gray-50 data-[state=active]:bg-white data-[state=active]:shadow-none rounded-lg">
                <Monitor className="w-4 h-4 -ml-2" />
                Show
              </TabsTrigger>
                                        <TabsTrigger value="job" className="flex items-center justify-center gap-2 bg-gray-50 data-[state=active]:bg-white data-[state=active]:shadow-none rounded-lg">
                <Briefcase className="w-4 h-4 -ml-2" />
                Job
              </TabsTrigger>
          </TabsList>

            {/* Link Tab */}
            <TabsContent value="link" className="mt-4">
              <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Submit Link</h3>
                  <div className="h-px bg-gray-100 mb-4 -mx-4" />
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter the title of your post"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url" className="text-sm">URL *</Label>
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Add a brief description or context"
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
            </TabsContent>

            {/* Show Tab */}
            <TabsContent value="show" className="mt-4">
              <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Submit Show</h3>
                  <div className="h-px bg-gray-100 mb-4 -mx-4" />
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="show-title" className="text-sm">Title *</Label>
                      <Input
                        id="show-title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="What are you showing?"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="show-url" className="text-sm">URL (optional)</Label>
                      <Input
                        id="show-url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="show-description" className="text-sm">Description *</Label>
                      <Textarea
                        id="show-description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Tell us about what you're showing"
                        rows={4}
                        required
                        className="text-sm"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>

            {/* Job Tab */}
            <TabsContent value="job" className="mt-4">
              <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Submit Job</h3>
                  <div className="h-px bg-gray-100 mb-4 -mx-4" />
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="job-title" className="text-sm">Job Title *</Label>
                      <Input
                        id="job-title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., Senior Software Engineer"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-sm">Company *</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Company name"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="e.g., Remote, San Francisco"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary" className="text-sm">Salary Range</Label>
                        <Input
                          id="salary"
                          value={formData.salary}
                          onChange={(e) => handleInputChange('salary', e.target.value)}
                          placeholder="e.g., $100k-$150k"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-url" className="text-sm">Application URL *</Label>
                      <Input
                        id="job-url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://company.com/careers/job"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-description" className="text-sm">Job Description</Label>
                      <Textarea
                        id="job-description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Brief description of the role and requirements"
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </main>
    </div>
  )
} 