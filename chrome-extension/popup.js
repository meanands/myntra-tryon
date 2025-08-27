class MyntraTryOnExtension {
    constructor() {
        this.apiKey = null;
        this.uploadedImage = null;
        this.currentUrl = null;
        this.init();
    }

    async init() {
        console.log('Initializing extension...');
        await this.checkApiKey();
        await this.checkSavedPhoto();
        this.setupEventListeners();
        this.checkCurrentTab();
    }

    async checkApiKey() {
        try {
            console.log('Checking for existing API key...');
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            console.log('Storage result:', result);
            this.apiKey = result.geminiApiKey;
            
            if (this.apiKey) {
                console.log('API key found, showing main section');
                document.getElementById('apiKeySection').style.display = 'none';
                document.getElementById('mainSection').style.display = 'block';
            } else {
                console.log('No API key found, showing setup section');
                document.getElementById('apiKeySection').style.display = 'block';
                document.getElementById('mainSection').style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            this.showError('Error checking API key: ' + error.message);
        }
    }

    async checkSavedPhoto() {
        try {
            console.log('Checking for saved photo...');
            
            // First check sync storage
            const syncResult = await chrome.storage.sync.get(['savedPhoto']);
            console.log('Sync storage result:', syncResult);
            
            if (syncResult.savedPhoto) {
                console.log('Saved photo found in sync storage, loading it...');
                this.uploadedImage = syncResult.savedPhoto;
                this.showImagePreview();
                this.showStatus('Saved photo loaded!');
                return;
            }
            
            // If not in sync, check local storage
            const localResult = await chrome.storage.local.get(['savedPhoto']);
            console.log('Local storage result:', localResult);
            
            if (localResult.savedPhoto) {
                console.log('Saved photo found in local storage, loading it...');
                this.uploadedImage = localResult.savedPhoto;
                this.showImagePreview();
                this.showStatus('Saved photo loaded from local storage!');
                return;
            }
            
            console.log('No saved photo found in either storage');
        } catch (error) {
            console.error('Error checking saved photo:', error);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // API Key management
        const saveButton = document.getElementById('saveApiKey');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.log('Save API key button clicked');
                this.saveApiKey();
            });
        } else {
            console.error('Save API key button not found!');
        }
        
        // Settings menu button
        const settingsMenuBtn = document.getElementById('settingsMenuBtn');
        if (settingsMenuBtn) {
            settingsMenuBtn.addEventListener('click', () => this.toggleSettingsMenu());
        }
        
        // Settings menu items
        const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
        if (changeApiKeyBtn) {
            changeApiKeyBtn.addEventListener('click', () => this.showApiKeyModal());
        }
        
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearSavedData());
        }
        
        const debugStorageBtn = document.getElementById('debugStorageBtn');
        if (debugStorageBtn) {
            debugStorageBtn.addEventListener('click', () => this.debugStorage());
        }
        
        // Modal buttons
        const updateApiKeyBtn = document.getElementById('updateApiKeyBtn');
        if (updateApiKeyBtn) {
            updateApiKeyBtn.addEventListener('click', () => this.updateApiKey());
        }
        
        const cancelApiKeyBtn = document.getElementById('cancelApiKeyBtn');
        if (cancelApiKeyBtn) {
            cancelApiKeyBtn.addEventListener('click', () => this.hideApiKeyModal());
        }
        
        // Close settings menu when clicking outside
        document.addEventListener('click', (e) => {
            const settingsDropdown = document.getElementById('settingsDropdown');
            const settingsMenuBtn = document.getElementById('settingsMenuBtn');
            
            if (settingsDropdown && settingsDropdown.style.display === 'block') {
                if (!settingsDropdown.contains(e.target) && !settingsMenuBtn.contains(e.target)) {
                    this.hideSettingsMenu();
                }
            }
        });
        
        // Saved results buttons
        const showSavedResultBtn = document.getElementById('showSavedResultBtn');
        if (showSavedResultBtn) {
            showSavedResultBtn.addEventListener('click', () => this.showSavedResult());
        }
        
        const generateNewBtn = document.getElementById('generateNewBtn');
        if (generateNewBtn) {
            generateNewBtn.addEventListener('click', () => this.generateNewTryOn());
        }
        
        // Image upload
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('imageInput').click();
            });
        }
        
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        const removeButton = document.getElementById('removeImage');
        if (removeButton) {
            removeButton.addEventListener('click', () => this.removeImage());
        }
        
        // Try-on button
        const tryOnButton = document.getElementById('tryOnButton');
        if (tryOnButton) {
            tryOnButton.addEventListener('click', () => this.generateTryOn());
        }
        
        // Results
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => this.downloadGeneratedImage());
        }
        
        const tryAgainButton = document.getElementById('tryAgainButton');
        if (tryAgainButton) {
            tryAgainButton.addEventListener('click', () => this.resetUI());
        }
        
        // Error handling
        const dismissErrorButton = document.getElementById('dismissError');
        if (dismissErrorButton) {
            dismissErrorButton.addEventListener('click', () => this.hideError());
        }
        
        console.log('Event listeners setup complete');
    }

    async checkCurrentTab() {
        try {
            console.log('Checking current tab...');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentUrl = tab.url;
            console.log('Current URL:', this.currentUrl);
            
            if (this.currentUrl && this.currentUrl.includes('myntra.com')) {
                console.log('Myntra URL detected');
                
                // Check if we have a saved try-on result for this product
                const hasSavedResult = await this.checkSavedTryOnResult();
                
                if (hasSavedResult) {
                    // Saved result found, show saved results section
                    document.getElementById('urlSection').style.display = 'none';
                    document.getElementById('savedResultsSection').style.display = 'block';
                } else {
                    // No saved result, show regular URL section
                    document.getElementById('urlSection').style.display = 'block';
                    document.getElementById('savedResultsSection').style.display = 'none';
                }
            } else {
                console.log('Not a Myntra URL');
                document.getElementById('urlSection').style.display = 'none';
                document.getElementById('savedResultsSection').style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
        }
    }

    generateProductKey(url) {
        // Extract product ID from Myntra URL
        const productIdMatch = url.match(/\/(\d+)\/buy/);
        if (productIdMatch) {
            return `tryon_${productIdMatch[1]}`;
        }
        // Fallback: use URL hash
        return `tryon_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
    }

    async checkSavedTryOnResult() {
        try {
            const productKey = this.generateProductKey(this.currentUrl);
            console.log('Checking for saved try-on result with key:', productKey);
            
            // Check sync storage first
            const syncResult = await chrome.storage.sync.get([productKey]);
            if (syncResult[productKey]) {
                console.log('Found saved try-on result in sync storage');
                this.savedTryOnData = syncResult[productKey];
                return true;
            }
            
            // Check local storage
            const localResult = await chrome.storage.local.get([productKey]);
            if (localResult[productKey]) {
                console.log('Found saved try-on result in local storage');
                this.savedTryOnData = localResult[productKey];
                return true;
            }
            
            console.log('No saved try-on result found for this product');
            this.savedTryOnData = null;
            return false;
        } catch (error) {
            console.error('Error checking saved try-on result:', error);
            this.savedTryOnData = null;
            return false;
        }
    }

    showSavedTryOnResult(savedData) {
        console.log('Showing saved try-on result');
        
        // Store the saved data for later use
        this.savedTryOnData = savedData;
        
        // Hide the regular URL section and show the saved results section
        document.getElementById('urlSection').style.display = 'none';
        document.getElementById('savedResultsSection').style.display = 'block';
        
        this.showStatus('Found saved try-on result for this product!');
    }

    async compressImage(imageDataUrl, maxSizeKB = 100) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions to maintain aspect ratio
                let { width, height } = img;
                const maxDimension = 800; // Max width/height
                
                if (width > height) {
                    if (width > maxDimension) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Start with high quality and reduce if needed
                let quality = 0.8;
                let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // If still too large, reduce quality further
                while (compressedDataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
                    quality -= 0.1;
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                console.log(`Image compressed: ${imageDataUrl.length} -> ${compressedDataUrl.length} bytes (quality: ${quality.toFixed(1)})`);
                resolve(compressedDataUrl);
            };
            img.src = imageDataUrl;
        });
    }

    async saveTryOnResult(imageDataUrl) {
        try {
            console.log('=== SAVE TRY-ON RESULT DEBUG ===');
            console.log('Current URL:', this.currentUrl);
            console.log('Original image data URL length:', imageDataUrl ? imageDataUrl.length : 'undefined');
            
            const productKey = this.generateProductKey(this.currentUrl);
            console.log('Generated product key:', productKey);
            
            // Compress the image to fit within storage limits
            console.log('Compressing image for storage...');
            const compressedImageDataUrl = await this.compressImage(imageDataUrl, 50); // 50KB limit
            
            console.log('Compressed image data URL length:', compressedImageDataUrl.length);
            
            const savedData = {
                imageDataUrl: compressedImageDataUrl,
                timestamp: Date.now(),
                url: this.currentUrl
            };
            
            console.log('Saving try-on result with key:', productKey);
            console.log('Saved data structure:', {
                hasImageDataUrl: !!savedData.imageDataUrl,
                imageDataUrlLength: savedData.imageDataUrl ? savedData.imageDataUrl.length : 0,
                timestamp: savedData.timestamp,
                url: savedData.url
            });
            
            // Try to save to sync storage first (compressed image should fit)
            try {
                console.log('Attempting to save to sync storage...');
                await chrome.storage.sync.set({ [productKey]: savedData });
                console.log('✅ Try-on result saved to sync storage successfully');
                this.showStatus('Try-on result saved for future visits!');
            } catch (syncError) {
                console.log('❌ Sync storage failed, saving to local storage:', syncError);
                // Fallback to local storage
                try {
                    await chrome.storage.local.set({ [productKey]: savedData });
                    console.log('✅ Try-on result saved to local storage successfully');
                    this.showStatus('Try-on result saved locally for future visits!');
                } catch (localError) {
                    console.error('❌ Both sync and local storage failed:', localError);
                    this.showStatus('Could not save try-on result');
                }
            }
        } catch (error) {
            console.error('❌ Error saving try-on result:', error);
            this.showStatus('Could not save try-on result');
        }
    }

    async saveApiKey() {
        console.log('saveApiKey method called');
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (!apiKeyInput) {
            console.error('API key input not found!');
            this.showError('API key input element not found');
            return;
        }
        
        const apiKey = apiKeyInput.value.trim();
        console.log('API key length:', apiKey.length);
        
        if (!apiKey) {
            console.log('No API key provided');
            this.showError('Please enter a valid API key');
            return;
        }

        try {
            console.log('Attempting to save API key to storage...');
            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            console.log('API key saved successfully');
            
            this.apiKey = apiKey;
            document.getElementById('apiKeySection').style.display = 'none';
            document.getElementById('mainSection').style.display = 'block';
            this.showStatus('API key saved successfully!');
        } catch (error) {
            console.error('Failed to save API key:', error);
            this.showError('Failed to save API key: ' + error.message);
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showError('Image size should be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            this.uploadedImage = e.target.result;
            this.showImagePreview();
            
            // Save the photo for future use (try sync first, fallback to local)
            try {
                // First try to save to sync storage (for cross-device sync)
                await chrome.storage.sync.set({ savedPhoto: e.target.result });
                console.log('Photo saved to sync storage successfully');
                this.showStatus('Photo saved for future use!');
            } catch (syncError) {
                console.log('Sync storage failed, trying local storage:', syncError);
                try {
                    // Fallback to local storage (higher limits)
                    await chrome.storage.local.set({ savedPhoto: e.target.result });
                    console.log('Photo saved to local storage successfully');
                    this.showStatus('Photo saved locally for future use!');
                } catch (localError) {
                    console.error('Both sync and local storage failed:', localError);
                    this.showStatus('Photo loaded but could not save for future use');
                }
            }
        };
        reader.readAsDataURL(file);
    }

    showImagePreview() {
        const previewContainer = document.getElementById('previewContainer');
        const previewImage = document.getElementById('previewImage');
        const uploadArea = document.getElementById('uploadArea');

        previewImage.src = this.uploadedImage;
        previewContainer.style.display = 'block';
        uploadArea.style.display = 'none';
        
        // Show a message that photo is loaded
        this.showStatus('Photo ready for try-on!');
    }

    async removeImage() {
        this.uploadedImage = null;
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('imageInput').value = '';
        
        // Also remove the saved photo from both storage types
        try {
            await chrome.storage.sync.remove(['savedPhoto']);
            await chrome.storage.local.remove(['savedPhoto']);
            console.log('Saved photo removed from both storage types');
            this.showStatus('Photo removed from storage');
        } catch (error) {
            console.error('Error removing saved photo:', error);
        }
    }

    async generateTryOn() {
        if (!this.uploadedImage) {
            this.showError('Please upload your photo first');
            return;
        }

        if (!this.currentUrl || !this.currentUrl.includes('myntra.com')) {
            this.showError('Please navigate to a Myntra product page');
            return;
        }

        // Set button to loading state
        this.setTryOnButtonLoading(true);

        try {
            await this.performTryOn(this.currentUrl);
        } finally {
            // Reset button state regardless of success or failure
            this.setTryOnButtonLoading(false);
        }
    }

    async performTryOn(url) {
        this.showLoading();
        
        try {
            console.log('=== Perform Try-On Debug ===');
            console.log('URL:', url);
            console.log('Uploaded image exists:', !!this.uploadedImage);
            
            // Extract product images from the URL
            console.log('About to call extractProductImages...');
            const productImages = await this.extractProductImages(url);
            console.log('Product images extracted:', productImages);
            
            if (!productImages) {
                throw new Error('Product images extraction returned null/undefined');
            }
            
            if (!Array.isArray(productImages)) {
                throw new Error(`Product images is not an array: ${typeof productImages}`);
            }
            
            if (productImages.length === 0) {
                throw new Error('No product images found on this page');
            }

            console.log('First product image:', productImages[0]);
            console.log('First product image src:', productImages[0].src);

            // Generate the try-on image
            const result = await this.generateImage(this.uploadedImage, productImages[0].src);
            
            if (result) {
                this.showResult(result);
            } else {
                throw new Error('Failed to generate try-on image');
            }
        } catch (error) {
            console.error('PerformTryOn error:', error);
            console.error('Error stack:', error.stack);
            this.showError(error.message || 'Failed to generate try-on image');
        }
    }

    async extractProductImages(url) {
        try {
            console.log('=== Image Extraction Debug ===');
            this.showStatus('Starting image extraction...');
            console.log('Extracting images from URL:', url);
            
            // Send message to content script to extract images
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', { id: tab.id, url: tab.url });
            this.showStatus('Found tab, sending message...');
            
            if (tab.url !== url) {
                console.log('Navigating to target URL...');
                this.showStatus('Navigating to target URL...');
                // Navigate to the URL first
                await chrome.tabs.update(tab.id, { url: url });
                console.log('Waiting for page load...');
                this.showStatus('Waiting for page load...');
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page load
            }

            console.log('Sending extractImages message to content script...');
            this.showStatus('Sending message to content script...');
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: 'extractImages' });
                console.log('Content script response:', response);
                this.showStatus('Received response from content script');
            } catch (error) {
                console.error('Error sending message to content script:', error);
                this.showStatus('Error: ' + error.message);
                if (error.message.includes('Could not establish connection')) {
                    throw new Error('Content script not loaded. Please refresh the page and try again.');
                }
                throw error;
            }
            console.log('Response type:', typeof response);
            console.log('Response keys:', response ? Object.keys(response) : 'null/undefined');
            this.showStatus('Processing response...');
            
            if (!response) {
                throw new Error('No response from content script');
            }
            
            if (!response.images) {
                console.error('Response structure:', response);
                throw new Error('No images property in content script response');
            }
            
            if (!Array.isArray(response.images)) {
                console.error('Images is not an array:', typeof response.images, response.images);
                throw new Error('Images property is not an array');
            }
            
            try {
                console.log('Extracted images count:', response.images.length);
                this.showStatus(`Found ${response.images.length} images`);
            } catch (error) {
                console.error('Error accessing response.images.length:', error);
                console.error('Response.images:', response.images);
                throw new Error(`Error accessing images array: ${error.message}`);
            }
            response.images.forEach((img, index) => {
                console.log(`Image ${index}:`, {
                    src: img.src,
                    alt: img.alt,
                    width: img.width,
                    height: img.height
                });
            });
            
            return response.images;
        } catch (error) {
            console.error('Error extracting images:', error);
            this.showStatus('Error: ' + error.message);
            throw new Error(`Failed to extract product images: ${error.message}`);
        }
    }

    async generateImage(personImage, productImageUrl) {
        try {
            console.log('=== Image Generation Debug ===');
            console.log('Person image type:', typeof personImage);
            console.log('Person image starts with:', personImage.substring(0, 50));
            console.log('Product image URL:', productImageUrl);
            
            // Download the product image
            console.log('About to call downloadImage...');
            console.log('downloadImage method exists:', typeof this.downloadImage);
            console.log('this object keys:', Object.keys(this));
            
            // Test the method with a simple call
            let productImageData;
            try {
                console.log('Testing downloadImage method...');
                productImageData = await this.downloadImage(productImageUrl);
                console.log('downloadImage completed, productImageData:', productImageData);
            } catch (error) {
                console.error('Error in downloadImage:', error);
                throw error;
            }
            console.log('Product image downloaded, base64 length:', productImageData.length);
            console.log('Product image base64 starts with:', productImageData.substring(0, 50));
            
            // Convert person image from data URL to base64
            console.log('Processing person image...');
            const personImageBase64 = personImage.split(',')[1];
            console.log('Person image base64 length:', personImageBase64.length);
            console.log('Person image base64 starts with:', personImageBase64.substring(0, 50));
            
            // Validate base64 data
            if (!personImageBase64 || personImageBase64.length < 100) {
                throw new Error('Person image base64 data is invalid or too short');
            }
            if (!productImageData || productImageData.length < 100) {
                throw new Error('Product image base64 data is invalid or too short');
            }
            
            console.log('Both images processed successfully, calling Gemini API...');
            
            // Call Gemini API
            const result = await this.callGeminiAPI(personImageBase64, productImageData);
            return result;
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }

    async downloadImage(url) {
        console.log('downloadImage method called with URL:', url);
        try {
            console.log('Downloading image from URL:', url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            const blob = await response.blob();
            console.log('Blob size:', blob.size, 'bytes');
            console.log('Blob type:', blob.type);
            
            console.log('Starting FileReader...');
            const result = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('FileReader onloadend called');
                    const result = reader.result;
                    console.log('FileReader result type:', typeof result);
                    if (typeof result === 'string') {
                        const base64 = result.split(',')[1];
                        console.log('Extracted base64 length:', base64.length);
                        resolve(base64);
                    } else {
                        console.error('FileReader result is not a string:', result);
                        reject(new Error('FileReader result is not a string'));
                    }
                };
                reader.onerror = (error) => {
                    console.error('FileReader error:', error);
                    reject(new Error('FileReader error: ' + error));
                };
                reader.readAsDataURL(blob);
            });
            
            console.log('FileReader completed, result length:', result.length);
            console.log('Returning result from downloadImage');
            return result;
        } catch (error) {
            console.error('Error downloading image:', error);
            throw new Error(`Failed to download product image: ${error.message}`);
        }
    }

    async callGeminiAPI(personImageBase64, productImageBase64) {
        console.log('=== Gemini API Call Debug ===');
        console.log('Person image base64 length:', personImageBase64.length);
        console.log('Product image base64 length:', productImageBase64.length);
        console.log('API Key length:', this.apiKey ? this.apiKey.length : 'undefined');
        
        // Validate base64 data
        if (!personImageBase64 || personImageBase64.length < 1000) {
            throw new Error(`Person image base64 is too short: ${personImageBase64.length} characters`);
        }
        if (!productImageBase64 || productImageBase64.length < 1000) {
            throw new Error(`Product image base64 is too short: ${productImageBase64.length} characters`);
        }
        
        const prompt = [
            { 
                parts: [
                    {
                        text: "You are a professional virtual try-on AI assistant. Your task is to create a realistic image where a person tries on clothing from a product image. Follow these instructions carefully:\n\n" +
                              "1. The FIRST image I upload is the PERSON who wants to try on the clothing\n" +
                              "2. The SECOND image I upload is the CLOTHING PRODUCT they want to try on\n" +
                              "3. Your job is to digitally fit the clothing from the second image onto the person in the first image\n" +
                              "4. Maintain the person's face, body proportions, and pose from the first image\n" +
                              "5. Apply the clothing design, color, and style from the second image\n" +
                              "6. Create a seamless, realistic result that looks like the person is actually wearing the clothing\n" +
                              "7. Return ONLY the generated image, no text explanation\n\n" +
                              "Ready? I'll upload the person's photo first:"
                    },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: personImageBase64,
                        },
                    },
                    {
                        text: "This is the person who wants to try on clothing. Now I'll upload the clothing product image:"
                    },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: productImageBase64,
                        },
                    },
                    {
                        text: "This is the clothing product. Please create a realistic try-on image where the person from the first image is wearing the clothing from the second image. " +
                              "Make sure the clothing fits naturally on the person's body, maintains the original design and color, and looks like a real photo. " +
                              "Return the generated image only."
                    }
                ]
            }
        ];

        console.log('Request payload structure:', {
            contentsLength: prompt.length,
            firstContentPartsLength: prompt[0].parts.length,
            hasTextParts: prompt[0].parts.some(p => p.text),
            hasImageParts: prompt[0].parts.some(p => p.inlineData)
        });

        const requestBody = {
            contents: prompt
        };

        console.log('Sending request to Gemini API...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response structure:', {
            hasCandidates: !!data.candidates,
            candidatesLength: data.candidates?.length,
            hasContent: !!data.candidates?.[0]?.content,
            hasParts: !!data.candidates?.[0]?.content?.parts
        });
        
        if (!data?.candidates?.[0]?.content?.parts) {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response from Gemini API');
        }

        const parts = data.candidates[0].content.parts;
        console.log('Response parts length:', parts.length);
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            console.log(`Part ${i}:`, {
                hasText: !!part.text,
                hasInlineData: !!part.inlineData,
                inlineDataLength: part.inlineData?.data?.length
            });
            
            if (part.inlineData?.data) {
                console.log('Found image data in part', i);
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }

        console.error('No image found in response parts');
        throw new Error('No image generated in response');
    }

    showLoading() {
        this.hideAllSections();
        document.getElementById('loadingSection').style.display = 'block';
    }

    showResult(imageDataUrl) {
        console.log('=== SHOW RESULT DEBUG ===');
        console.log('Image data URL received:', imageDataUrl ? 'Yes' : 'No');
        console.log('Image data URL length:', imageDataUrl ? imageDataUrl.length : 'undefined');
        
        this.hideAllSections();
        document.getElementById('resultImage').src = imageDataUrl;
        document.getElementById('resultsSection').style.display = 'block';
        this.generatedImageDataUrl = imageDataUrl;
        
        // Inject the generated image into the Myntra product page
        this.injectImageToPage(imageDataUrl);
        
        // Save the generated result for future use
        console.log('About to call saveTryOnResult...');
        this.saveTryOnResult(imageDataUrl);
    }

    resetUI() {
        this.hideAllSections();
        document.getElementById('mainSection').style.display = 'block';
        this.removeImage();
        document.getElementById('urlInput').value = '';
    }

    hideAllSections() {
        const sections = ['loadingSection', 'resultsSection', 'errorSection'];
        sections.forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
    }

    showError(message) {
        console.error('Error:', message);
        this.hideAllSections();
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorSection').style.display = 'block';
    }

    hideError() {
        document.getElementById('errorSection').style.display = 'none';
    }

    showStatus(message) {
        console.log('Status:', message);
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        setTimeout(() => {
            statusElement.textContent = '';
        }, 3000);
    }

    setTryOnButtonLoading(isLoading) {
        const tryOnButton = document.getElementById('tryOnButton');
        if (!tryOnButton) return;

        if (isLoading) {
            // Set loading state
            tryOnButton.disabled = true;
            tryOnButton.innerHTML = '<div class="button-spinner"></div> Generating...';
            tryOnButton.classList.add('loading');
        } else {
            // Reset to normal state
            tryOnButton.disabled = false;
            tryOnButton.innerHTML = 'Try This Dress';
            tryOnButton.classList.remove('loading');
        }
    }

    showSavedResult() {
        if (!this.savedTryOnData) {
            this.showError('No saved result found');
            return;
        }
        
        console.log('Showing saved try-on result');
        this.generatedImageDataUrl = this.savedTryOnData.imageDataUrl;
        this.showResult(this.savedTryOnData.imageDataUrl);
        this.injectImageToPage(this.savedTryOnData.imageDataUrl);
    }

    generateNewTryOn() {
        console.log('Generating new try-on instead of using saved result');
        
        // Hide saved results section and show regular URL section
        document.getElementById('savedResultsSection').style.display = 'none';
        document.getElementById('urlSection').style.display = 'block';
        
        // Generate new try-on
        this.generateTryOn();
    }

    // Debug method to check what's in storage
    async debugStorage() {
        try {
            console.log('=== DEBUG STORAGE ===');
            const syncData = await chrome.storage.sync.get(null);
            const localData = await chrome.storage.local.get(null);
            
            console.log('Sync storage:', syncData);
            console.log('Local storage:', localData);
            
            if (this.currentUrl) {
                const productKey = this.generateProductKey(this.currentUrl);
                console.log('Current product key:', productKey);
                
                // Check if we have saved data for this product
                const savedData = syncData[productKey] || localData[productKey];
                console.log('Saved data for this product:', savedData);
                console.log('Instance saved data:', this.savedTryOnData);
                
                if (savedData) {
                    console.log('Saved data details:', {
                        hasImageDataUrl: !!savedData.imageDataUrl,
                        imageDataUrlLength: savedData.imageDataUrl ? savedData.imageDataUrl.length : 0,
                        timestamp: savedData.timestamp,
                        url: savedData.url
                    });
                }
            }
        } catch (error) {
            console.error('Debug storage error:', error);
        }
    }

    toggleSettingsMenu() {
        const settingsDropdown = document.getElementById('settingsDropdown');
        if (settingsDropdown.style.display === 'block') {
            this.hideSettingsMenu();
        } else {
            this.showSettingsMenu();
        }
    }

    showSettingsMenu() {
        console.log('Showing settings menu');
        document.getElementById('settingsDropdown').style.display = 'block';
    }

    hideSettingsMenu() {
        console.log('Hiding settings menu');
        document.getElementById('settingsDropdown').style.display = 'none';
    }

    showApiKeyModal() {
        console.log('Showing API key change modal');
        this.hideSettingsMenu(); // Hide settings menu when opening modal
        document.getElementById('apiKeyModal').style.display = 'flex';
        document.getElementById('newApiKeyInput').focus();
    }

    hideApiKeyModal() {
        console.log('Hiding API key change modal');
        document.getElementById('apiKeyModal').style.display = 'none';
        document.getElementById('newApiKeyInput').value = '';
    }

    async updateApiKey() {
        console.log('updateApiKey method called');
        const newApiKeyInput = document.getElementById('newApiKeyInput');
        if (!newApiKeyInput) {
            console.error('New API key input not found!');
            this.showError('New API key input element not found');
            return;
        }
        
        const newApiKey = newApiKeyInput.value.trim();
        console.log('New API key length:', newApiKey.length);
        
        if (!newApiKey) {
            console.log('No new API key provided');
            this.showError('Please enter a valid API key');
            return;
        }

        try {
            console.log('Attempting to update API key in storage...');
            await chrome.storage.sync.set({ geminiApiKey: newApiKey });
            console.log('API key updated successfully');
            
            this.apiKey = newApiKey;
            this.hideApiKeyModal();
            this.showStatus('API key updated successfully!');
        } catch (error) {
            console.error('Failed to update API key:', error);
            this.showError('Failed to update API key: ' + error.message);
        }
    }

    async clearSavedData() {
        try {
            await chrome.storage.sync.clear();
            console.log('All saved data cleared');
            this.showStatus('All saved data cleared!');
            
            // Reset the UI
            this.apiKey = null;
            this.uploadedImage = null;
            document.getElementById('apiKeySection').style.display = 'block';
            document.getElementById('mainSection').style.display = 'none';
            this.removeImage();
        } catch (error) {
            console.error('Error clearing saved data:', error);
            this.showError('Error clearing saved data: ' + error.message);
        }
    }

    downloadGeneratedImage() {
        if (!this.generatedImageDataUrl) return;
        
        const link = document.createElement('a');
        link.href = this.generatedImageDataUrl;
        link.download = 'myntra-tryon.png';
        link.click();
    }

    async injectImageToPage(imageDataUrl) {
        try {
            console.log('Injecting generated image to Myntra page...');
            
            // Send message to content script to inject the image
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'injectTryOnImage',
                imageDataUrl: imageDataUrl
            });
            
            if (response && response.success) {
                console.log('Image successfully injected to page');
                this.showStatus('Try-on image added to product page!');
            } else {
                console.error('Failed to inject image:', response?.error);
                this.showStatus('Could not add image to page, but you can download it');
            }
        } catch (error) {
            console.error('Error injecting image to page:', error);
            this.showStatus('Could not add image to page, but you can download it');
        }
    }
}

// Initialize the extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing extension...');
    new MyntraTryOnExtension();
});
