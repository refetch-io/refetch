/** Shared, serializable shapes passed from the server to the UI. */

export type Vote = 'up' | 'down' | null
export type VoteDirection = 'up' | 'down'
export type ResourceType = 'post' | 'comment'

export type FeedSort = 'top' | 'new' | 'show'
export type ChannelSort = 'hot' | 'new'

export interface SessionUser {
  id: string
  name: string
  email: string
  /** Can review reports (Appwrite `moderator`/`admin` label, or MODERATOR_USER_IDS). */
  moderator?: boolean
}

export interface Post {
  id: string
  title: string
  description: string
  /** Absolute http(s) URL of the story, when it links out. */
  link: string | null
  /** Hostname without `www.`, derived from `link`. */
  domain: string | null
  type: 'link' | 'show'
  userId: string
  userName: string
  count: number
  countComments: number
  readingTime: number | null
  createdAt: string
  /** Channel the story belongs to (set at submission, or matched by topic). */
  channel: string | null
  /** The signed-in user's vote, if any. */
  vote: Vote
}

export interface PostDetail extends Post {
  tldr: string | null
  topics: Array<string>
  readingLevel: string | null
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  content: string
  /** Parent comment id for replies. */
  replyId: string | null
  count: number
  createdAt: string
  /** Set once the author edits it. */
  editedAt: string | null
  vote: Vote
}

export interface FeedPage {
  posts: Array<Post>
  page: number
  hasMore: boolean
}

export interface Thread {
  post: PostDetail
  comments: Array<Comment>
}

export interface VoteState {
  vote: Vote
  count: number
}

export interface TrendingTopic {
  key: string
  label: string
  articleCount: number
}

/** A topic page's subject: one of the AI labels stories are tagged with. */
export interface Topic {
  /** URL slug (`/topics/$key`). */
  key: string
  label: string
  /** Stories tagged with it, all time (0 when the daily stats haven't counted it yet). */
  articleCount: number
}

/** Newest first, or the best of the last 30 days. */
export type TopicSort = 'new' | 'top'

export interface TopicAbout {
  /** Topics that show up on the same stories, most often first. */
  related: Array<Topic>
  /** Channels that cover the topic. */
  channels: Array<string>
  /** Stories tagged with it over the last seven days. */
  weeklyStories: number
}

export type VisitorRange = '24h' | '30d' | '1y'

export interface VisitorPoint {
  label: string
  visitors: number
}

/** Activity since midnight UTC, for the rail's "Today" card. */
export interface TodayStats {
  /** Enhanced, on-topic stories shared today. */
  stories: number
  /** Stories shared yesterday by this time of day. */
  yesterday: number
  /** Stories per UTC hour, 00:00 first. */
  hours: Array<number>
  /** The current UTC hour (bars after it haven't happened yet). */
  hour: number
  comments: number
  votes: number
  /** Channels that got at least one story today. */
  channels: number
}

/** A thread's Appwrite Analytics totals since it was posted. */
export interface ThreadStats {
  views: number
  /** Unique people who viewed the thread. */
  visitors: number
  /** Times the linked article was opened, from a feed or from the thread. */
  articleOpens: number
  shares: number
  /** Chart buckets: hourly for the first two days, then daily (30 days at most). */
  interval: '1h' | '1d'
  /** Views per bucket (`visitors` holds the view count, matching the Sparkline's points). */
  points: Array<VisitorPoint>
  /** Where viewers came from, most first. */
  sources: Array<{ label: string; visitors: number }>
}

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; code?: string; existingId?: string }

export interface Channel {
  id: string
  name: string
  /** Directory section, e.g. "Languages". */
  category: string
  /** Short monogram shown when the channel has no icon ("Py", "PHP"). */
  glyph: string
  /** PNG icon URL (Appwrite Storage), or null to fall back to the glyph. */
  icon: string | null
  color: string
  description: string
  keywords: Array<string>
  memberCount: number
}

export interface ChannelSource {
  label: string
  /** Page people can visit (not the raw feed URL). */
  href: string
  domain: string
  official: boolean
}

export interface ChannelAbout {
  sources: Array<ChannelSource>
  /** Stories in the channel over the last seven days. */
  weeklyStories: number
}

export interface ChannelDirectory {
  channels: Array<Channel>
  /** Ids of channels the signed-in user has joined. */
  joined: Array<string>
}

export interface SearchResult {
  id: string
  title: string
  domain: string | null
  channel: string | null
  countComments: number
  count: number
  createdAt: string
}

/* ──────────────────────────────── People ──────────────────────────────── */

/** Who may start a conversation with someone. */
export type MessagePrivacy = 'everyone' | 'nobody'

export interface PersonSummary {
  id: string
  name: string
}

export interface Profile extends PersonSummary {
  bio: string
  website: string | null
  /** When the account was created, if known. */
  joinedAt: string | null
  allowMessages: MessagePrivacy
  isBot: boolean
  stats: { karma: number; stories: number; comments: number; followers: number; following: number }
  /** How the signed-in viewer relates to this person (null when signed out). */
  viewer: { isSelf: boolean; blocked: boolean; canMessage: boolean; following: boolean } | null
}

export interface ProfileInsights {
  /** Channels this person posts in most, busiest first. */
  channels: Array<{ id: string; stories: number }>
  topStories: Array<{ id: string; title: string; count: number; countComments: number }>
  /** Twelve monthly buckets, oldest first ("YYYY-MM"). */
  activity: Array<{ month: string; stories: number; comments: number }>
  following: Array<PersonSummary>
  followingTotal: number
}

export interface SuggestedPerson extends PersonSummary {
  /** Short reason shown under the name ("Founder of Appwrite", "12 stories"). */
  reason: string
  featured: boolean
}

export interface OnboardingSuggestions {
  channels: { selected: Array<string>; suggested: Array<string> }
  people: Array<SuggestedPerson>
}

export interface UserComment {
  id: string
  postId: string
  postTitle: string
  content: string
  count: number
  createdAt: string
}

export interface UserCommentsPage {
  comments: Array<UserComment>
  page: number
  hasMore: boolean
}

/** Someone in a followers or following list. */
export interface PersonCard extends PersonSummary {
  bio: string
}

export interface PeoplePage {
  people: Array<PersonCard>
  page: number
  hasMore: boolean
}

/* ─────────────────────────────── Messages ─────────────────────────────── */

export type ConversationType = 'direct' | 'group'
export type ConversationRole = 'owner' | 'member'

export interface ConversationSummary {
  id: string
  type: ConversationType
  /** Group name, or the other person's name in a direct conversation. */
  title: string
  /** The group's own name (null for direct conversations and unnamed groups). */
  name: string | null
  members: Array<PersonSummary>
  lastMessage: { preview: string; userId: string; at: string } | null
  unread: number
  muted: boolean
  updatedAt: string
}

export interface Inbox {
  conversations: Array<ConversationSummary>
  unread: number
}

export interface ConversationMember extends PersonSummary {
  role: ConversationRole
  lastReadAt: string | null
}

export interface MessageStory {
  id: string
  title: string
  domain: string | null
  count: number
  countComments: number
}

export interface MessageReaction {
  emoji: string
  userIds: Array<string>
}

export interface Message {
  id: string
  userId: string
  /** System messages describe group events ("Ada added Grace"). */
  kind: 'text' | 'system'
  content: string
  createdAt: string
  editedAt: string | null
  deleted: boolean
  replyTo: { id: string; userId: string; content: string; deleted: boolean } | null
  story: MessageStory | null
  reactions: Array<MessageReaction>
}

export interface MessagePage {
  /** Oldest first. */
  messages: Array<Message>
  hasMore: boolean
}

export interface ConversationDetail {
  conversation: ConversationSummary
  members: Array<ConversationMember>
  role: ConversationRole
  /** Why the viewer can't send right now (blocked, left…), or null. */
  readOnlyReason: string | null
}
