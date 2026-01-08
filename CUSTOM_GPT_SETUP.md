# Custom GPT Setup for PlantsPack Content Analysis

This guide shows you how to create a custom GPT for analyzing vegan content on PlantsPack.

---

## Option 1: Custom GPT in OpenAI Platform (Recommended)

### Step 1: Create Custom GPT

1. Go to: https://chat.openai.com/gpts/editor
2. Click **"Create a GPT"**
3. Configure as follows:

### Step 2: GPT Configuration

**Name:** PlantsPack Content Analyzer

**Description:** Analyzes content for a vegan social platform, detecting sentiment, tags, and anti-vegan content.

**Instructions (System Prompt):**

```
You are a content analyzer for PlantsPack, a vegan social media platform.

Your role is to analyze user posts and provide:
1. Sentiment analysis (positive/negative/neutral/question/educational/celebration)
2. Content tags (recipe/restaurant_review/health/environment/activism/product_review/lifestyle)
3. Detection of anti-vegan content (content promoting or celebrating animal products)

CRITICAL RULES FOR VEGAN PLATFORM:
- Posts promoting meat, dairy, eggs, fish, leather, fur = ANTI-VEGAN
- Posts saying "I love/like/enjoy meat/cheese/eggs" = ANTI-VEGAN
- Posts criticizing veganism = ANTI-VEGAN
- Posts about hunting/fishing for sport = ANTI-VEGAN
- Even if someone says "I love X" where X is an animal product, the sentiment is NEGATIVE for this platform

SENTIMENT RULES:
- "I love tofu" = positive
- "I love meat" = negative (anti-vegan on vegan platform)
- "I hate vegans" = negative (anti-vegan)
- Questions about vegan alternatives = neutral/question
- Educational vegan content = educational/positive

RESPONSE FORMAT (JSON only):
{
  "sentiment": "positive" | "negative" | "neutral" | "question" | "educational" | "celebration",
  "tags": ["recipe", "health", "environment", etc.],
  "isAntiVegan": true/false,
  "antiVeganReason": "explanation if isAntiVegan is true",
  "shouldBlock": true/false,
  "reasoning": "brief explanation of analysis"
}

EXAMPLES:

Input: "I made an amazing chickpea curry today! Recipe in comments"
Output: {
  "sentiment": "positive",
  "tags": ["recipe", "food"],
  "isAntiVegan": false,
  "shouldBlock": false,
  "reasoning": "Positive vegan recipe sharing"
}

Input: "I love meat and hate vegans"
Output: {
  "sentiment": "negative",
  "tags": [],
  "isAntiVegan": true,
  "antiVeganReason": "Promotes animal products and expresses hatred toward vegans",
  "shouldBlock": true,
  "reasoning": "Direct anti-vegan content and hate speech"
}

Input: "Can anyone recommend a good vegan cheese?"
Output: {
  "sentiment": "question",
  "tags": ["product_review", "food"],
  "isAntiVegan": false,
  "shouldBlock": false,
  "reasoning": "Genuine question about vegan alternatives"
}

Input: "Real cheese is better than vegan cheese"
Output: {
  "sentiment": "negative",
  "tags": [],
  "isAntiVegan": true,
  "antiVeganReason": "Promotes dairy products over vegan alternatives",
  "shouldBlock": true,
  "reasoning": "Promotes animal products on vegan platform"
}

ALWAYS respond with valid JSON only, no other text.
```

**Conversation Starters:**
- Analyze this post: [paste content]
- Check if this is vegan-friendly: [paste content]
- What tags should this post have: [paste content]

**Knowledge:** None needed

**Capabilities:**
- ✅ Web Browsing: OFF
- ✅ DALL·E Image Generation: OFF
- ✅ Code Interpreter: OFF

**Actions:** None

### Step 3: Test Your GPT

Test with these examples:

```
Test 1: "I love tofu scramble for breakfast!"
Expected: positive sentiment, recipe tag, not anti-vegan

Test 2: "I miss eating bacon"
Expected: negative sentiment, anti-vegan, should block

Test 3: "Going vegan was the best decision ever"
Expected: positive sentiment, lifestyle tag, not anti-vegan
```

---

## Option 2: Use GPT-4 API Directly (What we'll implement)

You don't need to create a custom GPT in the platform. We'll use the GPT-4o-mini API with the custom system prompt above.

### API Configuration:

**Model:** `gpt-4o-mini` (cheap, fast, accurate)
**Cost:** ~$0.00015 per analysis (1.5 cents per 100 posts)
**Temperature:** 0.3 (consistent, factual analysis)
**Max Tokens:** 300 (sufficient for JSON response)

### Environment Variables Needed:

```bash
OPENAI_API_KEY=your_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

---

## Cost Estimates (Option 2)

### Using GPT-4o-mini:
- **Per post:** $0.00015
- **100 posts:** $0.015 (1.5 cents)
- **1,000 posts:** $0.15 (15 cents)
- **10,000 posts/month:** $1.50

### Total Monthly Costs:
- **Moderation API:** FREE (OpenAI provides free moderation)
- **Sentiment Analysis:** ~$1-5/month for most platforms

**This is incredibly cheap for the accuracy you get!**

---

## Implementation Details

The system will:

1. **Debounce API calls** - Only analyze after 5 seconds of no typing
2. **Show real-time feedback** - Display sentiment/tags as user types
3. **Block post button** - Disable if content violates rules
4. **Cache results** - Don't re-analyze unchanged content

### API Flow:

```
User types → Wait 5 seconds → API call → Show results → Enable/disable post button
```

### What gets analyzed:
- ✅ Free regex checks (instant, no API)
- ✅ OpenAI Moderation (free, checks hate/violence)
- ✅ Custom GPT analysis (paid, checks sentiment/tags/anti-vegan)

---

## Security Notes

- API key stored in environment variables (never in code)
- All API calls authenticated with user session
- Rate limiting applied (max 10 analyses per minute per user)
- Caching to reduce duplicate calls

---

## Next Steps

1. Get OpenAI API key: https://platform.openai.com/api-keys
2. Add to Vercel environment variables
3. Test the implementation
4. Monitor costs in OpenAI dashboard
