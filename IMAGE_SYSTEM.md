# Image Upload System Documentation

## Overview
The vegan-social platform now supports image uploads for posts with Instagram-style presentation and up to 3 images per post.

## Features Implemented

### 🎨 **Image Upload & Display**
- **Drag & Drop Interface**: Intuitive file upload with visual feedback
- **Multiple Images**: Up to 3 images per post
- **Image Compression**: Automatic compression (1200px max width, 80% quality)
- **File Validation**: JPEG, PNG, WebP support, 10MB max size
- **Real-time Preview**: Instant preview during upload

### 📱 **Instagram-Style Layout**
- **Single Image**: Full-width display
- **Two Images**: Side-by-side grid layout
- **Three Images**: Interactive slider with navigation
- **Slider Controls**: Arrow navigation, dot indicators, image counter
- **Responsive Design**: Adapts to different screen sizes

### 🔧 **Technical Implementation**

#### Database Schema
```sql
-- Updated posts table
ALTER TABLE posts 
DROP COLUMN image_url,
ADD COLUMN images JSONB DEFAULT '[]';

-- Supabase Storage
Bucket: 'post-images'
Path Structure: {user_id}/{timestamp}-{random}.{ext}
```

#### Components Created
- `ImageUploader.tsx` - Handles file upload, compression, validation
- `ImageSlider.tsx` - Instagram-style image display with slider
- Updated `CreatePost.tsx` - Integrated image upload UI
- Updated `PostCard.tsx` - Displays images in posts
- Updated `SharePost.tsx` - Handles image sharing

#### Key Features
- **Automatic Compression**: Images compressed to optimal web size
- **Storage Integration**: Seamless Supabase storage integration  
- **Progress Indicators**: Visual upload progress and loading states
- **Error Handling**: Comprehensive validation and error messages
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 🚀 **User Experience**

#### Upload Flow
1. Click "Photo" button in post composer
2. Drag & drop or click to select images (up to 3)
3. Images auto-compress and upload to cloud storage
4. Real-time preview with removal options
5. Post with images to feed

#### Display Modes
- **1 Image**: Full-width, responsive aspect ratio
- **2 Images**: Clean grid layout, equal sizing
- **3+ Images**: Interactive slider with smooth transitions

#### Slider Navigation
- Arrow buttons (hidden at start/end)
- Dot indicators with active state
- Image counter (2/3 format)
- Smooth animations and transitions

### 🔒 **Security & Performance**
- **File Validation**: Type and size checking
- **User Isolation**: Storage paths include user ID
- **RLS Policies**: Proper read/write permissions
- **Optimized Loading**: Lazy loading with skeleton states
- **Memory Management**: Proper cleanup of blob URLs

### 📊 **Storage Structure**
```
post-images/
├── {user-id-1}/
│   ├── 1643723400000-abc123.jpg
│   └── 1643723500000-def456.png
└── {user-id-2}/
    └── 1643723600000-ghi789.webp
```

## Usage Examples

### Creating Post with Images
```typescript
// User clicks photo button
setShowImageUploader(true)

// Images uploaded automatically on selection
const handleImagesChange = (urls: string[]) => {
  setImageUrls(urls) // Updates state with cloud URLs
}

// Post creation includes image URLs
await supabase.from('posts').insert({
  content: "Check out this amazing vegan meal!",
  images: ["url1", "url2", "url3"],
  // ... other fields
})
```

### Displaying Images
```typescript
// PostCard automatically handles different layouts
{post.images && post.images.length > 0 && (
  <ImageSlider 
    images={post.images} 
    aspectRatio="auto"
    className="max-w-full"
  />
)}
```

## Future Enhancements
- [ ] Image filters and editing
- [ ] Album/gallery view
- [ ] Image zoom on click
- [ ] Advanced compression options
- [ ] Video support
- [ ] Image analytics and insights

The image system provides a modern, Instagram-like experience while maintaining optimal performance and user experience.