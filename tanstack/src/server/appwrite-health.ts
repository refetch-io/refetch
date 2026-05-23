import { createServerFn } from "@tanstack/react-start"
import { Query } from "node-appwrite"

import { getAppwriteConfig } from "@/lib/appwrite/config"
import { getTablesDB } from "@/lib/appwrite/server"

export type AppwriteHealth = {
  connected: boolean
  postCount: number
}

export const getAppwriteHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppwriteHealth> => {
    const { databaseId, postsCollectionId } = getAppwriteConfig()
    const tablesDB = getTablesDB()

    const result = await tablesDB.listRows(
      databaseId,
      postsCollectionId,
      [Query.limit(1)],
    )

    return {
      connected: true,
      postCount: result.total,
    }
  },
)
