import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type { FeedPage, Topic, TopicAbout } from '@/lib/types'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { getTopic, getTopicAbout, listTopTopics, listTopicFeed } from '@/server/topics.server'
import { getTrendingTopics } from '@/server/insights.server'
import { getSessionUser } from '@/server/session.server'

const topicKey = z.string().regex(/^[a-z0-9-]{1,80}$/)

/** Topics on the directory page: those with enough stories to be worth a visit. */
const DIRECTORY_SIZE = 240
const DIRECTORY_MIN_STORIES = 5

export const fetchTopicFeed = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      key: z.string().max(120),
      sort: z.enum(['new', 'top']),
      page: z.number().int().min(1).max(FEED_MAX_PAGES),
    }),
  )
  .handler(async ({ data }): Promise<{ topic: Topic; feed: FeedPage; about: TopicAbout }> => {
    if (!topicKey.safeParse(data.key).success) throw notFound()
    const [{ topic, known }, user] = await Promise.all([getTopic(data.key), getSessionUser()])
    const [feed, about] = await Promise.all([
      listTopicFeed(topic, data.sort, data.page, user?.id),
      getTopicAbout(topic),
    ])
    // A key nobody has used: no stats row and no stories.
    if (!known && feed.posts.length === 0 && about.related.length === 0) throw notFound()
    return { topic, feed, about }
  })

export const fetchTopicDirectory = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ trending: Array<Topic>; topics: Array<Topic> }> => {
    const [trending, topics] = await Promise.all([
      getTrendingTopics(),
      listTopTopics(DIRECTORY_SIZE, DIRECTORY_MIN_STORIES),
    ])
    return { trending, topics }
  },
)
