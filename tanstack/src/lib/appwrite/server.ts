import { Client, TablesDB } from "node-appwrite"

import { getAppwriteConfig } from "./config"

let adminClient: Client | null = null
let tablesDB: TablesDB | null = null

export function getAdminClient(): Client {
  if (!adminClient) {
    const { endpoint, projectId, apiKey } = getAppwriteConfig()
    adminClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey)
  }
  return adminClient
}

export function getTablesDB(): TablesDB {
  if (!tablesDB) {
    tablesDB = new TablesDB(getAdminClient())
  }
  return tablesDB
}
