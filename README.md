# Gator CLI 🐊

Gator is a command-line RSS feed aggregator written in TypeScript using Node.js and PostgreSQL. It lets you register users, follow RSS feeds, scrape posts, and browse the latest content from feeds you follow.

---

## 📦 Requirements

Before running this project, make sure you have:

- Node.js (v18+ recommended)
- PostgreSQL installed and running
- npm or pnpm
- A local database created (e.g. `gator`)

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Gator

npm install

CREATE DATABASE gator;

dbCredentials: {
  url: "postgres://postgres:postgres@localhost:5432/gator",
}


npx drizzle-kit generate
npx drizzle-kit migrate

⚙️ CLI Configuration

The CLI stores a local config file to track the current user.

When you first run:

npm run start register <username>

or:

npm run start login <username>

It will create/update your config so future commands know who you are.

🚀 Running the CLI

All commands are run using:

 unfollow <feed_url>

List followed feeds
npm run start following
📰 Content commands
Browse latest posts
npm run start browse [limit]

Example:

npm run start browse 10

If no limit is provided, it defaults to 2.

🔄 Feed scraping
Run continuous feed aggregation
npm run start agg <interval>

Example:

npm run start agg 10s

Supported intervals:

ms (milliseconds)
s (seconds)
m (minutes)
h (hours)
