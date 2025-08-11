import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Thread Not Found</h1>
      <p className="text-gray-600 mb-6">The thread you are looking for does not exist.</p>
      <Link href="/" passHref>
        <Button className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
