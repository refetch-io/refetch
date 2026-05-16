
<div align="center">
  <img width="1500" height="500" alt="image" src="https://github.com/user-attachments/assets/579106eb-19a1-44e0-b45d-a41f4e28f03e" />

  <br />
  <br />
  
  **Open-source alternative to YC-controller HN, featuring curated tech news, discussions, and community-driven content.**
  
  <br />
  <br />

  [![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Appwrite](https://img.shields.io/badge/Appwrite-18.2.0-FF6B6B?style=for-the-badge&logo=appwrite)](https://appwrite.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
</div>

---

**Refetch** was born from a simple yet powerful idea: create a modern, open-source alternative to Hacker News that combines the best of community-driven curation with intelligent AI-powered content discovery. Free from YC-control, open and transparent, doesn't favor anyone.

<div align="center">

## 🔥 Top Posts Today (Tuesday, September 16, 2025)

*Auto-updated with the highest-scoring community content*

</div>

**🥇 [Unraveling the Mystery of 'Leopard Spots' on Mars: A New Hint of Life?](https://refetch.io/threads/68c917670014c1882305)**
📊 Votes: **0** | ⏰ 7 minutes ago | 🔗 [Original](https://sciencedaily.com/releases/2025/09/250916032210.htm)

**🥈 [Condor Technology's 'Cuzco' RISC-V CPU to Revolutionize Datacenters](https://refetch.io/threads/68c852bb002bd3d604f5)**
📊 Votes: **0** | ⏰ 14 hours ago | 🔗 [Original](https://www.nextplatform.com/2025/09/15/condor-technology-to-fly-cuzco-risc-v-cpu-into-the-datacenter/)

**🥉 [AOMedia's Next-Gen Video Codec AV2 Set for Year-End Launch](https://refetch.io/threads/68c860fe0018b7b0180e)**
📊 Votes: **0** | ⏰ 13 hours ago | 🔗 [Original](https://aomedia.org/press%20releases/AOMedia-Announces-Year-End-Launch-of-Next-Generation-Video-Codec-AV2-on-10th-Anniversary/)

**⭐ [Active NPM Supply Chain Attack: Tinycolor and 40 Packages Compromised](https://refetch.io/threads/68c8ae020039b1701666)**
📊 Votes: **0** | ⏰ 7 hours ago | 🔗 [Original](https://socket.dev/blog/tinycolor-supply-chain-attack-affects-40-packages)

**⭐ [In-Depth Review: macOS 26 Tahoe](https://refetch.io/threads/68c84c5a0009ff3aa8eb)**
📊 Votes: **0** | ⏰ 14 hours ago | 🔗 [Original](https://arstechnica.com/gadgets/2025/09/macos-26-tahoe-the-ars-technica-review/)

---

*Last updated: 2025-09-16T08:00:21.416Z*



### What We're Building

- **🤖 AI-Powered Discovery**: Our intelligent scout functions automatically discover high-quality tech content from leading sources so you can be lazy and enjoy
- **🎯 Quality Curation**: Advanced algorithms analyze and rank content based on relevance, quality, and community value
- **🌍 Global Reach**: Multilingual support with AI-powered translations in 12+ languages
- **🔒 Privacy-First**: Built on Appwrite's secure, self-hostable backend infrastructure
- **📱 Modern UX**: Modern, responsive interface built with Next.js 15 and Tailwind CSS, the opposite of HN
- **🚀 Open Source**: 100% open source, community-driven

### Why Refetch?

While Hacker News has been the go-to platform for tech discussions for years, we believe there's room for innovation. Refetch brings:

- **Better Content Discovery**: AI algorithms that surface the most relevant tech news
- **Enhanced User Experience**: Modern, mobile-first design that works everywhere
- **Community Empowerment**: Open source codebase that anyone can contribute to
- **Transparent Algorithms**: Clear, documented ranking systems you can understand and improve

---

## 🏗️ Architecture Overview

Refetch is built with a modern, scalable architecture that prioritizes performance, maintainability, and developer experience.

### Frontend Stack

- **Next.js 15**: React framework with App Router, Server Components, and streaming
- **TypeScript**: Full type safety across the entire codebase
- **Tailwind CSS**: Utility-first CSS framework with custom design system

### Backend Infrastructure

- **Appwrite**: Complete backend-as-a-service platform
  - **Databases**: Collections for posts, comments, users, and votes
  - **Authentication**: User management with JWT tokens
  - **Functions**: Serverless functions for content processing
  - **Sites**: Next.js hosting with built-in CDN and DDoS protection

### AI-Powered Features

- **Content Scout**: Automatically discovers tech articles from 20+ sources
- **Content Enhancement**: AI analysis for quality scoring, categorization, and optimization
- **Smart Ranking**: Multi-factor algorithm considering time, quality, and community engagement
- **Multilingual Support**: AI-powered translations and language detection

---

## 📁 Project Structure

```
refetch/
├── app/                    # Next.js App Router pages
│   ├── (main)/            # Main application routes
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication flows
│   └── globals.css        # Global styles
├── components/             # Reusable React components
│   ├── ui/                # Base UI components (Radix + Tailwind)
│   └── [feature]/         # Feature-specific components
├── contexts/               # React contexts (auth, theme)
├── functions/              # Appwrite serverless functions
│   ├── scout/             # Content discovery automation
│   ├── enhancement/       # AI content analysis
│   ├── algorithm/         # Ranking algorithm
│   ├── topic-stats/       # Topic ranking (scheduled)
│   └── readme/            # Syncs top posts into GitHub README
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries and configurations
├── extensions/             # Browser extensions
└── styles/                 # Additional styling
```

### Key Directories Explained

- **`app/`**: Next.js 15 App Router with server and client components
- **`components/ui/`**: Reusable UI components built on Radix UI primitives
- **`functions/`**: Appwrite serverless functions for backend processing
- **`lib/`**: Core utilities, Appwrite client, and type definitions
- **`extensions/`**: Chrome extension for seamless Refetch integration

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Appwrite instance (self-hosted or cloud)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/refetch-io/refetch.git
   cd refetch
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` using [Environment variables](#environment-variables) as a checklist. A starter template also lives in [`env.example`](env.example).

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment variables

**Where to set them**

- **Next.js (local / hosting):** `.env.local` or `.env`. Only `NEXT_PUBLIC_*` values are exposed to the browser; keep secrets without that prefix.
- **Appwrite Functions:** set variables in the Console (this repo’s `appwrite:setup` creates functions but does not push env). Define shared keys once as **[global (project) variables](https://appwrite.io/docs/products/functions/environment-variables)** so every function inherits them; use per-function variables only to override or add keys.
- **Mirror the same values** for web vs functions where two names exist (`APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_ENDPOINT`, same for project ID) so nothing drifts.

Table IDs use the legacy name `*_COLLECTION_ID` but refer to **Appwrite Tables** table IDs.

### 1. Appwrite connection (global)

Use the same endpoint and project everywhere; some paths read `APPWRITE_*`, others `NEXT_PUBLIC_APPWRITE_*`.

| Variable | Description |
| --- | --- |
| `APPWRITE_ENDPOINT` | REST API base (e.g. `https://cloud.appwrite.io/v1`). Used by Functions and the Readme function. |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Same URL; required for the Next app and several functions. |
| `APPWRITE_PROJECT_ID` | Project ID (Functions / Readme). |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Same ID; required for the Next app and several functions. |
| `APPWRITE_API_KEY` | Server API key (never `NEXT_PUBLIC_*`). Needs table access for the site and appropriate scopes per function. |

### 2. Appwrite data IDs (global)

| Variable | Description |
| --- | --- |
| `APPWRITE_DATABASE_ID` | Tables DB database ID. |
| `APPWRITE_POSTS_COLLECTION_ID` | `posts` table. |
| `APPWRITE_COMMENTS_COLLECTION_ID` | `comments` table. |
| `APPWRITE_VOTES_COLLECTION_ID` | `votes` table. |
| `APPWRITE_DAILY_TOPICS_COLLECTION_ID` | `daily_topics` table (topic stats). |
| `APPWRITE_TOPICS_COLLECTION_ID` | `topics` table (topic stats). |

### 3. Site URLs (global)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Canonical public origin (metadata, OG); default `https://refetch.io`. |
| `APP_BASE_URL` | Same idea for server-generated links (e.g. Readme function); default `https://refetch.io`. |

### 4. OpenAI (global for AI functions)

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Scout and Enhancement. |
| `OPENAI_MODEL` | Enhancement only; default `gpt-4o-mini`. |

### 5. Scout-only (sources + actor + tuning)

Set at project level if you only run Scout, or override on the Scout function.

| Variable | Description |
| --- | --- |
| `TARGET_WEBSITES` | Comma-separated site roots to crawl (can be very long). |
| `SCOUT_USER_ID` | Appwrite user ID for automated posts/comments. |
| `SCOUT_USER_NAME` | Label for that user (default `Scout`). |
| `LLM_MAX_TOKENS` | Default `6000`. |
| `LLM_MAX_BATCH_SIZE` | Default `20`. |
| `LLM_MIN_BATCH_SIZE` | Default `5`. |
| `DEBUG_BATCHING` | `true` for extra logs. |
| `SCRAPING_DELAY_MS` | Default `3000`. |
| `MAX_URLS_PER_SOURCE` | Default `25`. |
| `MAX_ARTICLES_PER_RUN` | Default `1000`. |
| `DEBUG_URL_EXTRACTION` | Optional; see `env.example`. |

### 6. GitHub (Readme function only)

Safe to set globally if unused elsewhere.

| Variable | Description |
| --- | --- |
| `GITHUB_TOKEN` | PAT with `contents: write` (or equivalent) to update `README.md`. |
| `GITHUB_OWNER` | Owner (user or org). |
| `GITHUB_REPO` | Repository name. |
| `GITHUB_BRANCH` | Branch to commit on (default `main`). |

### 7. Plausible (Next API only)

| Variable | Description |
| --- | --- |
| `PLAUSIBLE_API_KEY` | Stats API key (`app/api/plausible/realtime`). |
| `PLAUSIBLE_SITE_ID` | Site / domain id in Plausible. |

### 8. SEO verification (Next only)

| Variable | Description |
| --- | --- |
| `GOOGLE_SITE_VERIFICATION` | Meta verification string. |
| `YANDEX_VERIFICATION` | Yandex. |
| `YAHOO_VERIFICATION` | Yahoo. |

### 9. Bootstrap & CI (`scripts/appwrite-setup.mjs`, runs before `next build` unless skipped)

Uses the same **Appwrite connection** and **data IDs** as above, plus:

| Variable | Description |
| --- | --- |
| `APPWRITE_SITE_API_ENDPOINT` | Injected on **Appwrite Sites** builds; used if `APPWRITE_ENDPOINT` / `NEXT_PUBLIC_APPWRITE_ENDPOINT` are unset. |
| `APPWRITE_SITE_PROJECT_ID` | Same for project ID. |
| `APPWRITE_DATABASE_NAME` | Optional DB display name when creating DB (default `Refetch`). |
| `SKIP_APPWRITE_SETUP` | `1` or `true` to skip bootstrap. |
| `APPWRITE_SETUP_DEPLOY_FUNCTIONS` | `1` to upload function code when a function has no deployment. |
| `APPWRITE_SETUP_FORCE_DEPLOY` | `1` to force a new deployment. |

### Which functions need which groups

| Function | Groups |
| --- | --- |
| **Scout** | 1, 2, 4, 5 |
| **Enhancement** | 1, 2, 4 (`OPENAI_MODEL` optional) |
| **Algorithm** | 1, 2 (posts only) |
| **Topic stats** | 1, 2 (incl. daily_topics + topics) |
| **Readme** | 1, 2 (posts only), 3 (`APP_BASE_URL`), 6 |
| **Next.js app + `app/api`** | 1 (`NEXT_PUBLIC_*` + `APPWRITE_API_KEY`), 2, 3 (optional), 7–8 (optional) |

---

## 🤝 Contributing

**Refetch was initially 100% vibe-coded, but we're excited to welcome contributions from humans too!** 

We believe in the power of community-driven development and welcome all types of contributions:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

---

## 🔧 Appwrite Functions

Refetch uses several Appwrite serverless functions for automated content processing:

### Scout Function
Automatically discovers high-quality tech content from 20+ sources including TechCrunch, The Verge, Ars Technica, and more.

### Enhancement Function
AI-powered content analysis that generates metadata, quality scores, and multilingual translations.

### Algorithm Function
Sophisticated ranking algorithm that considers time decay, quality metrics, and community engagement.

### Topic stats function
Scheduled job that aggregates post data into `daily_topics` and `topics` tables (see [Environment variables](#environment-variables)).

### Readme function
Commits an auto-generated “top posts” section into this repository’s `README.md` using the GitHub API.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>Made with ❤️ for the Refetch community</strong></p>
</div>
