"use client"

// Removed Image import
import { Card, CardContent } from "@/components/ui/card"
// Removed Carousel imports

interface Story {
  id: string
  title: string
  bgColorClass: string // Changed from imageUrl to bgColorClass
}

// Define a list of background colors that work well with purple
const storyBackgroundColors = [
  "bg-purple-200", // Slightly warmer purple
  "bg-indigo-200", // Slightly warmer indigo
  "bg-rose-100", // Warmer pink/rose
  "bg-orange-100", // Warm orange
  "bg-yellow-100", // Warm yellow
  "bg-amber-100", // Warm amber
  "bg-lime-100", // Warm lime green
  "bg-stone-100", // Warmer gray
]

// Function to get a random background color class
const getRandomBackgroundColor = (index: number) => {
  return storyBackgroundColors[index % storyBackgroundColors.length]
}

const dummyStories: Story[] = [
  { id: "1", title: "AI Breakthroughs in 2025 and Beyond", bgColorClass: getRandomBackgroundColor(0) },
  { id: "2", title: "Web3 Explained: The Decentralized Future", bgColorClass: getRandomBackgroundColor(1) },
  { id: "3", title: "Future of EVs: Charging Ahead", bgColorClass: getRandomBackgroundColor(2) },
  { id: "4", title: "Quantum Computing: The Next Frontier", bgColorClass: getRandomBackgroundColor(3) },
  { id: "5", title: "Cybersecurity Tips for the Modern Era", bgColorClass: getRandomBackgroundColor(4) },
  { id: "6", title: "DevOps Trends: Automation and Efficiency", bgColorClass: getRandomBackgroundColor(5) },
  { id: "7", title: "Cloud Native Architectures: A Deep Dive", bgColorClass: getRandomBackgroundColor(6) },
  { id: "8", title: "Data Science: Unlocking Insights", bgColorClass: getRandomBackgroundColor(7) },
  { id: "9", title: "Machine Learning: Algorithms in Action", bgColorClass: getRandomBackgroundColor(0) },
  { id: "10", title: "Frontend Frameworks: Choosing the Best", bgColorClass: getRandomBackgroundColor(1) },
]

export function StoriesCarousel() {
  return (
    <div className="p-0">
      <div className="flex overflow-x-scroll scrollbar-hide gap-4">
        {" "}
        {/* Removed px-4 */}
        {dummyStories.map((story, index) => (
          <div
            key={story.id}
            className={`flex-shrink-0 basis-[28.57%] ${index === 0 ? "ml-0" : ""} ${
              index === dummyStories.length - 1 ? "mr-0" : ""
            }`}
          >
            <Card className="cursor-pointer border-none shadow-none overflow-hidden">
              <CardContent className="p-0 flex flex-col h-full">
                <div className={`relative w-full h-36 rounded-t-lg ${story.bgColorClass}`}>
                  {/* Removed the inner div with story.title.split(" ")[0] */}
                </div>
                <div className="p-3 flex-grow">
                  <p className="text-sm font-medium text-gray-700 line-clamp-2">{story.title}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
