# AI Help Desk Setup Guide

The Help/AI feature requires an API key from OpenAI. Follow these steps to enable it:

## Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Go to API Keys → Create new secret key
4. Copy the key (you'll only see it once)

## Step 2: Add to Supabase

1. Go to https://app.supabase.com → Your Project
2. Click **Settings** (⚙️) → **Secrets** 
3. Click **New secret**
   - Name: `OPENAI_API_KEY`
   - Value: Paste your API key from Step 1
4. Click **Add secret**

## Step 3: Redeploy Functions

After adding the secret, Supabase will automatically redeploy your functions. Wait 1-2 minutes.

## Step 4: Test

1. Go back to your app at http://localhost:5173
2. Create/select a timetable
3. Click **Help** in the dashboard
4. Ask a question like:
   - "What is the 3rd hour for BCA?"
   - "Where is staff JOHN scheduled?"
   - "How many timetables do I have?"
   - "Suggest a substitute for staff PRIYA in BCA on Day 2"

## Alternative: Use Claude API

If you prefer Claude instead:

1. Get API key from https://console.anthropic.com/
2. In Supabase Secrets, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Claude API key

The function will automatically detect and use Claude.

## Troubleshooting

**"No AI API keys configured" error:**
- Make sure you added the secret in Supabase
- Wait 2 minutes for the deployment to complete
- Refresh the app

**"Rate limit exceeded":**
- Your API has hit the rate limit
- Wait a few minutes before asking another question

**"No response":**
- Check your API key has active credits
- For OpenAI: https://platform.openai.com/account/billing/overview
- For Claude: https://console.anthropic.com/

## Pricing

- **OpenAI GPT-3.5-turbo**: ~$0.0005 per 1000 words
- **Claude 3.5 Sonnet**: ~$0.003 per 1000 tokens

Both are very affordable for typical usage.

## Features

Once configured, the AI can:
- Answer questions about specific classes, subjects, and staff
- Show schedules for any class or staff member
- Calculate free hours and workload
- Suggest staff substitutions when absent
- Provide timetable statistics
- Answer natural language questions about your timetable
