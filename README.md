# 👗 Myntra Dress Try-On - AI Virtual Fitting

A beautiful web application that allows you to try on Myntra dresses using AI-powered virtual fitting technology. Upload your photo and paste any Myntra dress product URL to see how it looks on you!

## ✨ Features

- **Drag & Drop Photo Upload**: Easy photo upload with drag-and-drop functionality
- **Myntra Integration**: Works with any Myntra dress product URL
- **AI-Powered Try-On**: Uses Google Gemini Flash API for realistic virtual fitting
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Download Results**: Save your try-on images for later use
- **Mobile Friendly**: Works perfectly on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key (set in environment variables)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd myntra-try
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
# Create a .env file in the root directory
echo "GOOGLE_GEMINI_API_KEY=your_api_key_here" > .env
```

4. Build the TypeScript code:
```bash
npm run build
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## 📖 How to Use

1. **Upload Your Photo**: 
   - Drag and drop your photo or click to browse
   - Supported formats: JPG, PNG
   - Maximum file size: 10MB

2. **Enter Myntra URL**:
   - Copy any Myntra dress product URL
   - Paste it into the URL input field

3. **Generate Try-On**:
   - Click "Generate Try-On Image"
   - Wait for the AI to process your request
   - View your personalized try-on result

4. **Download Result**:
   - Click "Download Image" to save your try-on image

## 🛠️ API Endpoints

- `POST /upload-photos` - Upload user photos
- `POST /generate` - Generate try-on image using Myntra URL and uploaded photo
- `GET /data/:filename` - Serve uploaded and generated images
- `GET /` - Serve the main web interface

## 🎨 UI Features

- **Step-by-Step Process**: Clear visual indicators for each step
- **Real-time Validation**: Form validation and error handling
- **Loading States**: Beautiful loading animations
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Clear success notifications

## 🔧 Technical Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **AI**: Google Gemini Flash API
- **File Handling**: Multer for file uploads
- **Web Scraping**: Playwright for extracting Myntra product images

## 📱 Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Note**: This application is for educational and personal use. Please respect Myntra's terms of service and use responsibly.
