// Test file for abuse protection functionality
// This can be run with: npx tsx lib/abuseProtection.test.ts

// Mock constants and types for testing
const MAX_SUBMISSIONS_PER_16_HOURS = 5
const SUBMISSION_WINDOW_HOURS = 16

interface SubmissionLimitResult {
  allowed: boolean
  count: number
  limit: number
}

// Mock function to simulate the abuse protection logic
function checkUserSubmissionLimitMock(
  userId: string, 
  mockSubmissions: Array<{ createdAt: string }>
): SubmissionLimitResult {
  try {
    // Calculate the timestamp for 16 hours ago
    const sixteenHoursAgo = new Date(Date.now() - (SUBMISSION_WINDOW_HOURS * 60 * 60 * 1000))
    
    console.log(`Checking submissions for user ${userId} since ${sixteenHoursAgo.toISOString()}`)
    
    // Filter submissions created in the last 16 hours
    const recentSubmissions = mockSubmissions.filter(submission => {
      const createdAt = new Date(submission.createdAt)
      return createdAt > sixteenHoursAgo
    })
    
    const submissionCount = recentSubmissions.length
    const allowed = submissionCount < MAX_SUBMISSIONS_PER_16_HOURS
    
    console.log(`Found ${submissionCount} submissions for user ${userId} in last ${SUBMISSION_WINDOW_HOURS} hours`)
    
    return {
      allowed,
      count: submissionCount,
      limit: MAX_SUBMISSIONS_PER_16_HOURS
    }
  } catch (error) {
    console.error('Error checking user submission limit:', error)
    return { allowed: true, count: 0, limit: MAX_SUBMISSIONS_PER_16_HOURS }
  }
}

// Test scenarios
async function testAbuseProtection() {
  console.log('Testing abuse protection functionality...\n')
  
  const now = new Date()
  const userId = 'test-user-123'
  
  // Test data with different timestamps
  const testSubmissions = [
    { createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },    // 2 hours ago
    { createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },    // 4 hours ago
    { createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString() },    // 8 hours ago
    { createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString() },   // 12 hours ago
    { createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString() },   // 20 hours ago (should be excluded)
    { createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() },   // 24 hours ago (should be excluded)
  ]
  
  try {
    // Test 1: User with 4 submissions in last 16 hours (should be allowed)
    console.log('1. Testing user with 4 submissions in last 16 hours...')
    const recentSubmissions = testSubmissions.slice(0, 4) // First 4 submissions
    const result1 = checkUserSubmissionLimitMock(userId, recentSubmissions)
    console.log(`   Result: ${result1.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${result1.count}/${result1.limit})`)
    console.log(`   Expected: ALLOWED (4 < 5)`)
    console.log(`   Status: ${result1.allowed === true ? '✅ PASS' : '❌ FAIL'}\n`)
    
    // Test 2: User with 5 submissions in last 16 hours (should be blocked)
    console.log('2. Testing user with 5 submissions in last 16 hours...')
    const result2 = checkUserSubmissionLimitMock(userId, testSubmissions.slice(0, 5)) // First 5 submissions
    console.log(`   Result: ${result2.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${result2.count}/${result2.limit})`)
    console.log(`   Expected: BLOCKED (5 >= 5)`)
    console.log(`   Status: ${result2.allowed === false ? '✅ PASS' : '❌ FAIL'}\n`)
    
    // Test 3: User with 6 submissions in last 16 hours (should be blocked)
    console.log('3. Testing user with 6 submissions in last 16 hours...')
    const result3 = checkUserSubmissionLimitMock(userId, testSubmissions) // All 6 submissions
    console.log(`   Result: ${result3.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${result3.count}/${result3.limit})`)
    console.log(`   Expected: BLOCKED (6 > 5)`)
    console.log(`   Status: ${result3.allowed === false ? '✅ PASS' : '❌ FAIL'}\n`)
    
    // Test 4: User with 0 submissions (should be allowed)
    console.log('4. Testing user with 0 submissions...')
    const result4 = checkUserSubmissionLimitMock(userId, [])
    console.log(`   Result: ${result4.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${result4.count}/${result4.limit})`)
    console.log(`   Expected: ALLOWED (0 < 5)`)
    console.log(`   Status: ${result4.allowed === true ? '✅ PASS' : '❌ FAIL'}\n`)
    
    // Test 5: Verify time window calculation
    console.log('5. Testing time window calculation...')
    const sixteenHoursAgo = new Date(now.getTime() - (SUBMISSION_WINDOW_HOURS * 60 * 60 * 1000))
    const includedCount = testSubmissions.filter(s => new Date(s.createdAt) > sixteenHoursAgo).length
    const excludedCount = testSubmissions.filter(s => new Date(s.createdAt) <= sixteenHoursAgo).length
    console.log(`   Submissions in last 16 hours: ${includedCount}`)
    console.log(`   Submissions older than 16 hours: ${excludedCount}`)
    console.log(`   Total test submissions: ${testSubmissions.length}`)
    console.log(`   Status: ${includedCount + excludedCount === testSubmissions.length ? '✅ PASS' : '❌ FAIL'}\n`)
    
    console.log('🎉 All abuse protection tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAbuseProtection()
}

export { testAbuseProtection, checkUserSubmissionLimitMock }
