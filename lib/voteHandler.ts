export const handleVote = (id: string, direction: "up" | "down") => {
  // In a real application, this would send a request to your backend
  // to update the vote count for the given item ID.
  // For this demo, we're just logging the action.
  console.log(`Voting ${direction} for item ${id}`)
}
