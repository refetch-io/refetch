"use client"

export function RightSidebar() {
  const trendingTopics = [
    "AI",
    "Cloud Computing",
    "Web Development",
    "Cybersecurity",
    "Data Science",
    "Open Source",
    "DevOps",
    "Machine Learning",
  ]

  return (
    <div className="bg-white rounded-lg pb-4">
      <h3 className="font-normal text-gray-900 mb-2 px-4 pt-4 font-heading">Trending Now</h3>
      {/* Separator between title and first item */}
      <div className="h-px bg-gray-100 my-1" />
      <div className="space-y-0">
        {trendingTopics.map((topic, index) => (
          <div key={topic}>
            <div className="text-sm text-gray-700 py-1 px-4">
              <p className="font-light">#{topic}</p> {/* Added # and font-light to the topic */}
            </div>
            {index < trendingTopics.length - 1 && <div className="h-px bg-gray-100 my-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}
