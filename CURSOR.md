# Myntra Virtual Try-On Project

## Project Overview

This project consists of two main components:
1. **Web Application** - A Node.js/Express server that provides virtual try-on functionality
2. **Chrome Extension** - A client-side extension that replicates the web app functionality

Both components use Google's Gemini AI to generate realistic virtual try-on images by combining user photos with Myntra product images.

## 🏗️ Architecture Overview

```
myntra-try/
├── src/                    # Web Application (Node.js/Express)
│   ├── server.ts          # Main Express server
│   ├── gemini.ts          # Gemini AI integration
│   ├── browser.ts         # Web scraping with Playwright
│   ├── types.ts           # TypeScript type definitions
│   └── gemini-alternative.ts # Alternative Gemini approach
├── chrome-extension/       # Chrome Extension
│   ├── manifest.json      # Extension configuration
│   ├── popup.html/js      # Main UI and functionality
│   ├── content.js         # Content script for Myntra pages
│   ├── background.js      # Background service worker
│   ├── options.html/js    # API key management
│   └── styles.css         # Extension styling
├── data/                  # Generated images and uploads
├── dist/                  # Compiled TypeScript
└── index.html            # Web app frontend
```

## 🌐 Web Application

### Technology Stack
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI**: Google Gemini 2.5 Flash Image Preview API
- **Web Scraping**: Playwright (Chromium)
- **File Upload**: Multer
- **Image Processing**: Base64 encoding/decoding

### Key Components

#### 1. Server (`src/server.ts`)
**Main Express server with two primary endpoints:**

- **`POST /upload-photos`**: Handles image uploads
  - Uses Multer for file processing
  - Stores images in `data/` directory with UUID names
  - Supports multiple image uploads (max 10 files, 10MB each)

- **`POST /generate`**: Generates virtual try-on images
  - Accepts: `{ url: string, myImage: string }`
  - Scrapes Myntra product images using Playwright
  - Downloads and saves product images
  - Calls Gemini API for image generation
  - Returns generated image URL

#### 2. Gemini Integration (`src/gemini.ts`)
**Core AI functionality:**

```typescript
async function generateImage(myImage: string, productImage: string)
```

**Process:**
1. Reads uploaded person image and product image
2. Converts to base64 format
3. Constructs detailed prompt for virtual try-on
4. Calls Gemini 2.5 Flash Image Preview API
5. Saves generated image to `data/edited/` directory
6. Returns file path for display

**Prompt Structure:**
- Professional virtual try-on instructions
- Person image (first upload)
- Product image (second upload)
- Detailed styling and fitting requirements

#### 3. Web Scraping (`src/browser.ts`)
**Myntra product image extraction:**

```typescript
async function extractFromPage(url: string)
```

**Features:**
- Uses Playwright with anti-detection measures
- Targets `.image-grid-image` selector
- Handles lazy loading and dynamic content
- Extracts multiple product images
- Supports various image formats (jpg, jpeg, png, webp)

#### 4. Alternative Gemini Approach (`src/gemini-alternative.ts`)
**Conversational approach for better results:**
- Uses multi-turn conversation with Gemini
- May provide more detailed and accurate results
- Activated via `?conversational=true` query parameter

### API Endpoints

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/` | GET | Serve main HTML page | None |
| `/upload-photos` | POST | Upload user images | `photos[]` (multipart) |
| `/generate` | POST | Generate try-on image | `{url, myImage}` |
| `/data/:filename` | GET | Serve uploaded/generated images | `filename` |

### Data Flow (Web App)

1. **User Upload**: Image uploaded via `/upload-photos`
2. **URL Input**: User provides Myntra product URL
3. **Image Extraction**: Server scrapes product images from Myntra
4. **AI Processing**: Gemini generates virtual try-on
5. **Result Display**: Generated image served and displayed

## 🔌 Chrome Extension

### Technology Stack
- **Manifest**: V3 (latest Chrome extension standard)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Chrome Storage API
- **Permissions**: Storage, Active Tab, Scripting, Tabs
- **Host Permissions**: Myntra.com, Google APIs

### Key Components

#### 1. Manifest (`chrome-extension/manifest.json`)
**Extension configuration:**
- Manifest V3 specification
- Required permissions for storage and tab access
- Content scripts for Myntra page interaction
- Options page for API key management

#### 2. Popup Interface (`chrome-extension/popup.html/js`)
**Main user interface:**

**Features:**
- API key setup and validation
- Image upload with preview
- Myntra URL detection
- Manual URL input
- Loading states and error handling
- Result display and download

**Key Methods:**
- `saveApiKey()`: Stores Gemini API key in Chrome storage
- `handleImageUpload()`: Processes user image uploads
- `extractProductImages()`: Gets images from Myntra pages
- `callGeminiAPI()`: Direct API integration
- `generateImage()`: Orchestrates the entire process

#### 3. Content Script (`chrome-extension/content.js`)
**Myntra page interaction:**

```typescript
class MyntraImageExtractor
```

**Functionality:**
- Listens for messages from popup
- Extracts product images using multiple selectors
- Handles various image loading patterns
- Returns image URLs to popup

#### 4. Background Script (`chrome-extension/background.js`)
**Extension lifecycle management:**
- Handles installation events
- Manages extension icon clicks
- Coordinates between popup and content scripts

#### 5. Options Page (`chrome-extension/options.html/js`)
**API key management:**
- Secure storage of Gemini API key
- User-friendly setup interface
- Clear instructions for obtaining API key

### Data Flow (Chrome Extension)

1. **Setup**: User configures Gemini API key
2. **Image Upload**: User uploads photo via popup
3. **URL Detection**: Extension detects Myntra pages automatically
4. **Image Extraction**: Content script extracts product images
5. **AI Processing**: Direct Gemini API call from popup
6. **Result Display**: Generated image shown in popup

## 🔑 API Key Management

### Web Application
- Uses environment variables (`GEMINI_API_KEY`)
- Loaded via `dotenv` package
- Server-side only (secure)

### Chrome Extension
- Stored in Chrome Storage API
- Client-side management via options page
- Encrypted in transit, stored locally

## 🖼️ Image Processing

### Supported Formats
- **Input**: JPG, JPEG, PNG, WebP
- **Output**: PNG (base64 encoded)
- **Size Limits**: 10MB per image

### Processing Pipeline
1. **Upload**: File validation and storage
2. **Conversion**: Base64 encoding for API
3. **Download**: Product image fetching
4. **Generation**: Gemini AI processing
5. **Storage**: Result saving and serving

## 🎯 Key Features Comparison

| Feature | Web App | Chrome Extension |
|---------|---------|------------------|
| **Setup** | Server deployment required | Simple installation |
| **API Key** | Environment variable | User configuration |
| **Image Upload** | Server-side storage | Client-side processing |
| **URL Detection** | Manual input | Automatic detection |
| **Image Extraction** | Playwright scraping | Content script |
| **AI Processing** | Server-side | Client-side |
| **Result Display** | Web page | Extension popup |
| **Download** | Browser download | Extension download |

## 🚀 Development & Deployment

### Web Application
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

### Chrome Extension
1. Create icons using `chrome-extension/icons/create_icons.html`
2. Load unpacked extension in Chrome
3. Configure API key via options page
4. Test on Myntra product pages

## 🔧 Configuration

### Environment Variables (Web App)
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Chrome Extension Settings
- API key stored in Chrome Storage
- Accessible via extension options page
- Automatically synced across devices

## 📁 File Structure Details

### Web Application Files
- `src/server.ts`: Main server logic (250 lines)
- `src/gemini.ts`: AI integration (163 lines)
- `src/browser.ts`: Web scraping (172 lines)
- `src/types.ts`: TypeScript definitions
- `index.html`: Frontend interface (628 lines)

### Chrome Extension Files
- `manifest.json`: Extension configuration
- `popup.html`: Main UI (150+ lines)
- `popup.js`: Core functionality (400+ lines)
- `content.js`: Page interaction (100+ lines)
- `styles.css`: Responsive design (300+ lines)

## 🎨 UI/UX Features

### Web Application
- Modern, responsive design
- Drag-and-drop image upload
- Real-time progress indicators
- Error handling and validation
- Mobile-friendly interface

### Chrome Extension
- Compact popup interface
- Intuitive workflow
- Status indicators and loading states
- Error messages and recovery
- One-click functionality

## 🔒 Security Considerations

### Web Application
- File type validation
- Size limits enforcement
- Server-side API key storage
- Input sanitization
- CORS configuration

### Chrome Extension
- Client-side API key storage
- Permission-based access
- Content script isolation
- Secure message passing
- Local data processing

## 🐛 Common Issues & Solutions

### Web Application
- **Playwright timeout**: Increase timeout values
- **Image extraction failure**: Check Myntra page structure
- **API rate limits**: Implement request throttling
- **Memory issues**: Optimize image processing

### Chrome Extension
- **API key not saving**: Check Chrome storage permissions
- **Image extraction failing**: Verify content script injection
- **Popup not loading**: Check manifest configuration
- **CORS errors**: Ensure proper host permissions

## 📈 Performance Optimization

### Web Application
- Image compression before upload
- Caching of extracted images
- Async processing for multiple requests
- Memory management for large images

### Chrome Extension
- Efficient image processing
- Minimal DOM manipulation
- Optimized API calls
- Background processing where possible

## 🔄 Future Enhancements

### Potential Improvements
- Batch processing for multiple products
- User account management
- Result history and favorites
- Advanced image editing features
- Mobile app development
- Social sharing integration

### Technical Upgrades
- WebSocket for real-time updates
- Service worker for offline functionality
- Progressive Web App features
- Advanced caching strategies
- Multi-language support

---

This document serves as a comprehensive reference for understanding the Myntra Virtual Try-On project architecture, implementation details, and development workflow. Both the web application and Chrome extension provide the same core functionality through different deployment models, offering users flexibility in how they access the virtual try-on service.
