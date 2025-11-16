# Feed Relevancy Algorithm

## Overview

The PlantsPack feed relevancy algorithm is a **non-AI** engagement-based ranking system that combines multiple signals to surface the most interesting and relevant content for users. It does not use machine learning or artificial intelligence - instead, it uses a deterministic scoring algorithm based on engagement metrics and recency.

## How It Works

### Core Algorithm

The relevancy score is calculated using two main factors:

```typescript
const relevancyScore = (engagementScore * 0.7) + (recencyBoost * 0.3)
```

### 1. Engagement Score (70% weight)

**Formula:** `likes + comments`

This represents the total engagement a post has received. Posts with more likes and comments are considered more valuable and interesting to the community.

### 2. Recency Boost (30% weight)

**Formula:** `Math.exp(-hoursOld / 24)`

This is an exponential decay function that:
- Gives newer posts a higher score
- Posts lose half their recency boost every 24 hours
- Prevents old posts from dominating the feed even if they have high engagement

## Algorithm Implementation

### Step 1: Data Retrieval
- Fetches 3x the requested number of posts (e.g., 30 posts to return top 10)
- Includes engagement data (likes, comments) for each post
- Only considers public posts

### Step 2: Score Calculation
For each post:
1. Calculate engagement score: `post_likes.length + comments.length`
2. Calculate recency boost: `Math.exp(-hoursOld / 24)`
3. Combine scores: `(engagement * 0.7) + (recency * 0.3)`

### Step 3: Ranking and Pagination
1. Sort posts by relevancy score (highest first)
2. Apply pagination (return only requested slice)
3. Return ranked posts

## Example Scenarios

### Scenario 1: New vs Popular
- **Post A:** 0 likes, 0 comments, posted 1 hour ago → Score: ~0.27
- **Post B:** 10 likes, 5 comments, posted 48 hours ago → Score: ~5.4

**Result:** Post B ranks higher due to strong engagement despite being older.

### Scenario 2: Recent vs Very Old
- **Post A:** 5 likes, 2 comments, posted 6 hours ago → Score: ~5.16
- **Post B:** 8 likes, 4 comments, posted 72 hours ago → Score: ~8.4

**Result:** Post B still ranks higher, but the gap is smaller due to recency boost.

### Scenario 3: Very Recent vs Moderately Engaged
- **Post A:** 1 like, 0 comments, posted 30 minutes ago → Score: ~0.99
- **Post B:** 3 likes, 1 comment, posted 12 hours ago → Score: ~3.4

**Result:** Post B ranks higher despite being older due to better engagement.

## Fallback Behavior

If the relevancy algorithm fails for any reason:
- Falls back to simple chronological ordering (most recent first)
- Ensures users always see content even if scoring fails

## Performance Considerations

- **Database Impact:** Requires fetching 3x posts to ensure good ranking
- **Computation:** Lightweight scoring - no complex ML inference
- **Caching:** No caching implemented yet (future optimization opportunity)

## Future Enhancements

The current algorithm could be enhanced with:

### Personalization Layer
- User interaction history (which posts they've liked/commented on)
- Follow relationships (boost posts from followed users)
- Content preferences (preferred tags, topics)

### Content Quality Signals
- Post length optimization (sweet spot detection)
- Image presence bonus
- Tag diversity scoring

### True AI Integration
For actual AI-powered recommendations, we could implement:
- **Content Embeddings:** Use text embedding models to understand post semantics
- **Collaborative Filtering:** ML models to predict user preferences
- **Deep Learning:** Neural networks trained on user interaction patterns

## Configuration

Current weights can be adjusted in `/src/lib/feed-algorithm.ts`:

```typescript
// Current configuration
const ENGAGEMENT_WEIGHT = 0.7
const RECENCY_WEIGHT = 0.3
const RECENCY_HALF_LIFE = 24 // hours

// In getRelevancyRankedPosts function:
const relevancyScore = (engagementScore * ENGAGEMENT_WEIGHT) + (recencyBoost * RECENCY_WEIGHT)
```

## Conclusion

While not AI-powered, this algorithm provides a solid foundation for content ranking that balances community engagement with content freshness. It ensures users see both popular content and recent updates, creating an engaging feed experience without the complexity and computational overhead of machine learning systems.