# Branching Stories Comic Creator

An interactive application for creating branching comic stories with AI-generated images.

## Features

- Generate comic panels with AI
- Create branching storylines 
- Visualize story flow
- Multiple AI model options (Gemini and ChatGPT/DALL-E)
- Persistent image storage with Vercel Blob

## Setting Up Vercel Blob Storage

This application uses Vercel Blob Storage for image persistence. To set it up:

1. Create a `.env.local` file at the root of the project with:

```env
# Vercel Blob storage configuration
BLOB_READ_WRITE_TOKEN="your-read-write-token"

# If you're testing locally with a store created in the Vercel dashboard, use:
# BLOB_STORE_ID="your-store-id"

# Or for a quickstart, leave empty to automatically create a store
BLOB_STORE_ID=""

# OpenAI API key
OPENAI_API_KEY="your-openai-api-key"
```

2. Get a Blob read-write token:
   - If deploying on Vercel: The token is automatically available
   - For local development: Create a token in the Vercel dashboard under your project's "Storage" tab

3. (Optional) Create a Blob store:
   - Go to the Vercel dashboard > Storage tab
   - Create a new Blob store
   - Copy the Store ID to your .env.local file

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Technology Stack

- Next.js
- React
- Tailwind CSS
- Google Gemini API
- OpenAI API (GPT-4o and DALL-E)
- Vercel Blob Storage
- TypeScript
