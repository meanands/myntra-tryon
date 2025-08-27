# Myntra Virtual Try-On Chrome Extension

A Chrome extension that allows you to virtually try on Myntra dresses using Google's Gemini AI.

## Features

- Upload your photo directly from the extension popup
- Automatically detect Myntra product pages
- Generate realistic virtual try-on images using Gemini AI
- Download generated images
- Secure API key storage

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

## Setup

1. Click on the extension icon to open the popup
2. Enter your Gemini API key (or go to Options to configure it)
3. To get a Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key

## Usage

1. **Upload Your Photo**: Click the upload area in the extension popup to select your photo
2. **Navigate to Myntra**: Go to any Myntra product page
3. **Generate Try-On**: Click the extension icon and press "Try This Dress"
4. **View Results**: The generated image will appear in the popup
5. **Download**: Click "Download Image" to save the result

## Manual URL Input

If you're not on a Myntra page, you can manually enter a Myntra product URL in the extension popup.

## Privacy & Security

- Your API key is stored locally in Chrome's sync storage
- Images are processed directly by Google's Gemini API
- No data is stored on external servers
- All processing happens in your browser

## Troubleshooting

- **No images found**: Make sure you're on a valid Myntra product page
- **API errors**: Verify your Gemini API key is correct and has sufficient quota
- **Slow generation**: Image generation can take 30-60 seconds depending on server load

## Technical Details

- Uses Chrome Extension Manifest V3
- Integrates with Google Gemini 2.5 Flash Image Preview API
- Extracts product images from Myntra pages using content scripts
- Processes images client-side for privacy

## Development

To modify the extension:

1. Edit the files in the `chrome-extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

This project is for educational and personal use only.
