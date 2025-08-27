// Content script to extract product images from Myntra pages
class MyntraImageExtractor {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                console.log('Content script: Received message:', request);
                if (request.action === 'extractImages') {
                    this.extractImages().then(images => {
                        console.log('Content script: Sending response with', images.length, 'images');
                        sendResponse({ images: images });
                    }).catch(error => {
                        console.error('Content script: Error in extractImages:', error);
                        sendResponse({ error: error.message });
                    });
                    return true; // Keep the message channel open for async response
                } else if (request.action === 'injectTryOnImage') {
                    this.injectTryOnImage(request.imageDataUrl).then(result => {
                        sendResponse(result);
                    }).catch(error => {
                        console.error('Content script: Error injecting try-on image:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true; // Keep the message channel open for async response
                }
            } catch (error) {
                console.error('Content script: Error in message listener:', error);
                sendResponse({ error: error.message });
            }
        });
    }

    async extractImages() {
        const targetSelector = ".image-grid-image";
        const images = [];

        try {
            console.log('Content script: Starting image extraction...');
            
            // Wait for images to load
            await this.waitForImages(targetSelector);

            // Extract image URLs
            const elements = document.querySelectorAll(targetSelector);
            console.log('Content script: Found', elements.length, 'elements with selector:', targetSelector);
            
            for (const element of elements) {
                const imageUrl = this.extractImageUrl(element);
                if (imageUrl) {
                    images.push({
                        src: imageUrl,
                        alt: element.alt || '',
                        width: element.width || element.naturalWidth || 0,
                        height: element.height || element.naturalHeight || 0
                    });
                }
            }

            // If no images found with the target selector, try alternative selectors
            if (images.length === 0) {
                console.log('Content script: No images found with primary selector, trying alternatives...');
                const alternativeSelectors = [
                    '.product-image img',
                    '.product-detail-image img',
                    '.image-container img',
                    '[data-testid*="image"] img',
                    'img[src*="product"]',
                    '.product img'
                ];

                for (const selector of alternativeSelectors) {
                    const altElements = document.querySelectorAll(selector);
                    console.log('Content script: Found', altElements.length, 'elements with selector:', selector);
                    
                    for (const element of altElements) {
                        const imageUrl = this.extractImageUrl(element);
                        if (imageUrl) {
                            images.push({
                                src: imageUrl,
                                alt: element.alt || '',
                                width: element.width || element.naturalWidth || 0,
                                height: element.height || element.naturalHeight || 0
                            });
                        }
                    }
                    if (images.length > 0) {
                        console.log('Content script: Found images with selector:', selector);
                        break;
                    }
                }
            }

            console.log('Content script: Total images extracted:', images.length);
            return images;
        } catch (error) {
            console.error('Content script: Error extracting images:', error);
            throw error;
        }
    }

    async waitForImages(selector, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('Images not found within timeout');
    }

    extractImageUrl(element) {
        console.log('Content script: Extracting image URL from element:', element);
        
        // Try different methods to extract image URL
        const methods = [
            () => element.src, // Direct src attribute
            () => element.getAttribute('data-src'), // Lazy loading
            () => element.getAttribute('data-lazy-src'), // Another lazy loading pattern
            () => {
                // Extract from background image
                const style = window.getComputedStyle(element);
                const backgroundImage = style.backgroundImage;
                if (backgroundImage && backgroundImage !== 'none') {
                    const match = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                    return match ? match[1] : null;
                }
                return null;
            },
            () => {
                // Extract from inline style
                const inlineStyle = element.getAttribute('style');
                if (inlineStyle) {
                    const match = inlineStyle.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                    return match ? match[1] : null;
                }
                return null;
            }
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                const url = methods[i]();
                console.log(`Content script: Method ${i} returned:`, url);
                if (url && this.isValidImageUrl(url)) {
                    const absoluteUrl = this.makeAbsoluteUrl(url);
                    console.log('Content script: Valid image URL found:', absoluteUrl);
                    return absoluteUrl;
                }
            } catch (error) {
                console.warn('Content script: Error in image extraction method', i, ':', error);
            }
        }

        console.log('Content script: No valid image URL found for element');
        return null;
    }

    isValidImageUrl(url) {
        const isValid = url && 
               (url.startsWith('http') || url.startsWith('//')) &&
               (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp'));
        
        console.log('Content script: URL validation:', { url, isValid });
        return isValid;
    }

    makeAbsoluteUrl(url) {
        if (url.startsWith('//')) {
            return 'https:' + url;
        }
        if (url.startsWith('/')) {
            return window.location.origin + url;
        }
        return url;
    }

    async injectTryOnImage(imageDataUrl) {
        try {
            console.log('Content script: Injecting try-on image to page...');
            console.log('Image data URL length:', imageDataUrl.length);
            
            // Find the main image grid container
            let imageGridContainer = document.querySelector('.image-grid-container');
            let usedSelector = 'image-grid-container';
            
            if (!imageGridContainer) {
                console.log('Could not find .image-grid-container, trying alternative selectors...');
                // Try multiple selectors to find the image container
                const selectors = [
                    '.image-grid-image',
                    '.product-image',
                    '.product-detail-image',
                    '.image-container',
                    '[data-testid*="image"]',
                    '.product img',
                    '.product-image img'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log('Found element with selector:', selector);
                        // Navigate up to find the main container
                        imageGridContainer = element.closest('.image-grid-container') || 
                                           element.closest('[class*="grid"]') || 
                                           element.parentElement;
                        usedSelector = selector;
                        break;
                    }
                }
                
                if (!imageGridContainer) {
                    console.log('Could not find image container, trying alternative approach...');
                    // Try to find any container with images
                    const allImages = document.querySelectorAll('img[src*="myntassets"]');
                    console.log('Found', allImages.length, 'Myntra images on page');
                    
                    if (allImages.length > 0) {
                        imageGridContainer = allImages[0].closest('.image-grid-container') || 
                                           allImages[0].closest('div') || 
                                           allImages[0].parentElement;
                        usedSelector = 'fallback';
                    }
                }
            }
            
            if (!imageGridContainer) {
                throw new Error('Could not find any suitable image container on the page');
            }
            
            console.log('Using container:', imageGridContainer);
            console.log('Container class:', imageGridContainer.className);
            console.log('Container children count:', imageGridContainer.children.length);

            // Create the proper structure to match Myntra's layout
            // Create image-grid-col50 div
            const colDiv = document.createElement('div');
            colDiv.className = 'image-grid-col50';
            colDiv.style.cssText = `
                width: 50%;
                float: left;
                position: relative;
            `;

            // Create image-grid-imageContainer div
            const imageContainerDiv = document.createElement('div');
            imageContainerDiv.className = 'image-grid-imageContainer';
            imageContainerDiv.style.cssText = `
                position: relative;
                width: 100%;
                height: 100%;
            `;

            // Create the actual image div
            const tryOnImageElement = document.createElement('div');
            tryOnImageElement.className = 'image-grid-image try-on-result';
            tryOnImageElement.id = 'myntra-tryon-result';
            
            // Style it to match Myntra's image styling but with our try-on features
            tryOnImageElement.style.cssText = `
                background-image: url('${imageDataUrl}');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                position: absolute;
                cursor: pointer;
                border: 3px solid #ff3f6c;
                border-radius: 8px;
                width: 100%;
                height: 100%;
                min-height: 300px;
                box-shadow: 0 4px 12px rgba(255, 63, 108, 0.3);
                z-index: 1000;
            `;

            // Add a prominent label
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: #ff3f6c;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            label.textContent = '✨ Try-On';
            tryOnImageElement.appendChild(label);

            // Add click handler to open the image in full size
            tryOnImageElement.addEventListener('click', () => {
                this.openImageInModal(imageDataUrl);
            });

            // Assemble the structure
            imageContainerDiv.appendChild(tryOnImageElement);
            colDiv.appendChild(imageContainerDiv);

            // Insert the complete structure at the beginning of the image grid container
            let mainInjectionSuccess = false;
            try {
                imageGridContainer.insertBefore(colDiv, imageGridContainer.firstChild);
                console.log('Inserted try-on image with proper structure at beginning of container');
                mainInjectionSuccess = true;
            } catch (insertError) {
                console.log('Failed to insert at beginning, trying append:', insertError);
                try {
                    imageGridContainer.appendChild(colDiv);
                    console.log('Appended try-on image with proper structure to container');
                    mainInjectionSuccess = true;
                } catch (appendError) {
                    console.log('Failed to append, trying to insert after first child:', appendError);
                    if (imageGridContainer.firstChild) {
                        imageGridContainer.insertBefore(colDiv, imageGridContainer.firstChild.nextSibling);
                        console.log('Inserted try-on image after first child');
                        mainInjectionSuccess = true;
                    } else {
                        imageGridContainer.appendChild(colDiv);
                        console.log('Appended try-on image as fallback');
                        mainInjectionSuccess = true;
                    }
                }
            }

            // Only create floating element if main injection failed
            if (!mainInjectionSuccess) {
                console.log('Main injection failed, creating floating element as backup...');
                const floatingElement = document.createElement('div');
                floatingElement.id = 'myntra-tryon-floating';
                floatingElement.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: white;
                    border-radius: 12px;
                    padding: 10px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    border: 2px solid #ff3f6c;
                `;
                
                const floatingImage = tryOnImageElement.cloneNode(true);
                floatingImage.style.width = '150px';
                floatingImage.style.height = '200px';
                floatingImage.style.margin = '0';
                
                const floatingLabel = document.createElement('div');
                floatingLabel.textContent = 'Your Try-On Result';
                floatingLabel.style.cssText = `
                    text-align: center;
                    font-weight: bold;
                    color: #ff3f6c;
                    margin-bottom: 8px;
                    font-size: 14px;
                `;
                
                floatingElement.appendChild(floatingLabel);
                floatingElement.appendChild(floatingImage);
                
                // Add close button
                const closeButton = document.createElement('button');
                closeButton.textContent = '×';
                closeButton.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: #ff3f6c;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                `;
                closeButton.onclick = () => document.body.removeChild(floatingElement);
                floatingElement.appendChild(closeButton);
                
                document.body.appendChild(floatingElement);
                console.log('Added floating try-on element as backup');
            } else {
                console.log('Main injection successful, no floating element needed');
            }

            console.log('Content script: Try-on image successfully injected');
            return { success: true };
        } catch (error) {
            console.error('Content script: Error injecting try-on image:', error);
            throw error;
        }
    }

    openImageInModal(imageDataUrl) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            cursor: pointer;
        `;

        // Create image element
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 8px;
        `;

        // Add close functionality
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.appendChild(img);
        document.body.appendChild(modal);
    }
}

// Initialize the extractor
console.log('Content script: MyntraImageExtractor initialized');
new MyntraImageExtractor();
console.log('Content script: MyntraImageExtractor instance created');

