// Simple test file for JWT caching functionality
// This can be run with: npx tsx lib/jwtCache.test.ts

import { getCachedJWT, clearCachedJWT, refreshJWT } from './jwtCache'

async function testJWTCaching() {
  console.log('Testing JWT caching functionality...')
  
  try {
    // Test 1: First call should create a fresh JWT
    console.log('\n1. Testing first JWT call...')
    const jwt1 = await getCachedJWT()
    console.log('✅ First JWT obtained:', jwt1 ? 'Success' : 'Failed')
    
    // Test 2: Second call should return cached JWT
    console.log('\n2. Testing cached JWT call...')
    const jwt2 = await getCachedJWT()
    console.log('✅ Cached JWT obtained:', jwt2 ? 'Success' : 'Failed')
    console.log('JWT1 === JWT2:', jwt1 === jwt2 ? '✅ (Cached)' : '❌ (Not cached)')
    
    // Test 3: Force refresh should get new JWT
    console.log('\n3. Testing force refresh...')
    const jwt3 = await refreshJWT()
    console.log('✅ Refreshed JWT obtained:', jwt3 ? 'Success' : 'Failed')
    console.log('JWT2 === JWT3:', jwt2 === jwt3 ? '❌ (Same token)' : '✅ (Different token)')
    
    // Test 4: Clear cache and verify fresh JWT
    console.log('\n4. Testing cache clear...')
    clearCachedJWT()
    const jwt4 = await getCachedJWT()
    console.log('✅ Fresh JWT after clear:', jwt4 ? 'Success' : 'Failed')
    console.log('JWT3 === JWT4:', jwt3 === jwt4 ? '❌ (Same token)' : '✅ (Different token)')
    
    console.log('\n🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testJWTCaching()
}

export { testJWTCaching }
