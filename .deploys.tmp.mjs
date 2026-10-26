import { Client, Sites, Query } from 'node-appwrite'
const sites = new Sites(
  new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY),
)
const r = await sites.listDeployments({
  siteId: '688e6ad00039239f1ecc',
  queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
})
for (const d of r.deployments) console.log(d.$id, d.status, d.providerCommitHash?.slice(0, 7), d.$createdAt)
