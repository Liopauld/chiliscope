# Cloudinary Integration Setup Guide

## What is Cloudinary?

Cloudinary is a cloud-based image and video management service. It provides:
- **Image Upload & Storage** - Store images in the cloud instead of your server
- **Automatic Optimization** - Auto-compress and convert images to optimal formats
- **Transformations** - Resize, crop, and transform images on-the-fly via URL
- **CDN Delivery** - Fast global image delivery
- **Free Tier** - 25GB storage, 25GB bandwidth/month

## Why We're Using It

The forum feature allows users to attach images to posts. Cloudinary:
1. Handles image uploads without bloating your MongoDB/server storage
2. Automatically optimizes images for web (smaller file sizes, faster loading)
3. Provides a secure URL for each uploaded image
4. Scales easily as your userbase grows

---

## Setup Instructions

### 1. Create a Free Cloudinary Account

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up with your email
3. Verify your email address

### 2. Get Your API Credentials

Once logged in:

1. Go to your **Dashboard** ([https://cloudinary.com/console](https://cloudinary.com/console))
2. You'll see your credentials:
   - **Cloud Name** (e.g., `dxxxxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123`)

### 3. Add Credentials to Backend `.env`

Edit `backend/.env` and fill in your Cloudinary credentials:

```env
# Cloudinary Configuration (for forum image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=chiliscope
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=dj3k8x9z2
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=A1B2C3D4E5F6G7H8I9J0
CLOUDINARY_FOLDER=chiliscope
```

### 4. Restart Your Backend Server

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

---

## How It Works

### User Flow (Creating a Post with Images)

1. User clicks "New Post" in the Forum
2. User writes title/content and selects images (jpg, png, webp)
3. **Before submitting the post**, images are uploaded to Cloudinary via `POST /api/v1/forum/upload-image`
4. Cloudinary returns URLs like: `https://res.cloudinary.com/dj3k8x9z2/image/upload/v1234567890/chiliscope/forum/user123/abc123.jpg`
5. These URLs are saved in the `images` array field when creating the post
6. When viewing posts, images are loaded directly from Cloudinary's CDN

### Backend Implementation

**File:** `backend/app/core/cloudinary_service.py`
- `upload_image()` - Uploads a file to Cloudinary with automatic optimization
- `delete_image()` - Deletes an image by public_id
- `get_optimized_url()` - Generates optimized URLs with transformations

**File:** `backend/app/api/forum.py`
- `POST /forum/upload-image` - Authenticated endpoint that accepts a file and returns Cloudinary URL

**File:** `backend/app/schemas/forum.py`
- `PostCreate.images: List[str]` - List of Cloudinary URLs
- `PostResponse.images: List[str]` - List of Cloudinary URLs

### Frontend Implementation

**File:** `frontend/src/pages/Forum.tsx`
- Image upload input in "New Post" modal
- Uploads files to `/forum/upload-image` endpoint
- Stores returned URLs in `uploadedImages` state
- Sends URLs in `images` array when creating post
- Displays images in post cards (first image as thumbnail) and detail modal (all images in a grid)

**File:** `frontend/src/lib/api.ts`
- `forumApi.uploadImage(file)` - Uploads a file and returns Cloudinary URL
- `forumApi.createPost({ ..., images: [...] })` - Creates post with image URLs

---

## Image Upload Features

### Automatic Optimization

All uploaded images are automatically:
- **Resized** to max 2000px (preserves aspect ratio)
- **Compressed** with `quality: auto:good`
- **Format-converted** to best format (WebP when supported)

### Folder Organization

Images are organized in Cloudinary by user:
```
chiliscope/
  └─ forum/
      ├─ user_abc123/
      │   ├─ image1.jpg
      │   ├─ image2.png
      │   └─ ...
      └─ user_xyz456/
          └─ ...
```

### Supported Formats

- JPEG / JPG
- PNG
- WebP
- GIF

---

## Usage Example

### Creating a Post with Images

1. Navigate to Forum page (`/forum`)
2. Click "New Post" button
3. Fill in title and content
4. Click "Choose File" under "Images (optional)"
5. Select 1 or more images (up to your browser's limit)
6. Wait for "Images uploaded!" toast notification
7. See image thumbnails appear below the file input
8. Click "Post" to publish

### Viewing Posts with Images

- **Post List**: First image shown as a preview thumbnail
- **Post Detail**: All images displayed in a 2-column grid

---

## Free Tier Limits

Cloudinary's free plan includes:
- **25 GB** storage
- **25 GB** monthly bandwidth
- **Unlimited** transformations
- **Up to 10GB** total media library

This is more than enough for a thesis project or small community forum. If you exceed limits, Cloudinary will notify you and you can upgrade or delete old images.

---

## Troubleshooting

### "Cloudinary is not configured" Error

**Cause:** Environment variables not set or backend not restarted

**Fix:**
1. Check `backend/.env` has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
2. Restart backend server

### Upload Fails with 401 Unauthorized

**Cause:** Invalid API credentials

**Fix:**
1. Double-check credentials in Cloudinary dashboard
2. Ensure no extra spaces or quotes in `.env` file
3. Restart backend

### Images Not Showing

**Cause:** CORS or network issue

**Fix:**
1. Check browser console for errors
2. Ensure Cloudinary URLs are accessible (try opening in new tab)
3. Check if you're logged in (upload requires authentication)

---

## Testing Without Cloudinary

If you don't want to set up Cloudinary yet, the forum will still work — you just can't upload images. Posts without images work perfectly fine.

To test the full feature:
1. Set up a free Cloudinary account (5 minutes)
2. Add credentials to `.env`
3. Restart backend
4. Try uploading an image in a forum post

---

## Security Notes

- **Authentication Required**: Only logged-in users can upload images
- **File Type Validation**: Only image files allowed (jpeg, png, webp, gif)
- **User Folders**: Images are organized by user ID for easy tracking
- **Public URLs**: Uploaded images are publicly accessible via URL (this is normal for forum images)

---

## Next Steps

Once Cloudinary is set up, you can:
1. Test image uploads in the forum
2. Extend to other features (e.g., user profile pictures, chili scan result images)
3. Add image moderation (Cloudinary has AI moderation APIs)
4. Implement image transformations (thumbnails, watermarks, etc.)

For questions, see Cloudinary docs: https://cloudinary.com/documentation
