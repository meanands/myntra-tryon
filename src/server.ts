import {chromium} from "playwright"
import {json} from "body-parser"
import express, {Request, Response} from "express"
import multer from "multer"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import fs from "fs"
import https from "https"
import http from "http"
import { GenerateRequest } from "./types";
import { extractFromPage } from "./browser";
import { generateImage } from "./gemini"
import { generateImageConversational } from "./gemini-alternative"

function extractUrlsFromCss(cssValue: string) {
    if (!cssValue) return [];
    const urls = [];
    const re = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
    let m;
    while ((m = re.exec(cssValue)) !== null) {
      urls.push(m[2]);
    }
    return urls;
  }


  // Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'data/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Function to download and save an image
async function downloadAndSaveImage(imageUrl: string, folderPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = new URL(imageUrl);
        const protocol = url.protocol === 'https:' ? https : http;
        
        // Generate unique filename with proper extension
        const extension = path.extname(url.pathname) || '.jpg';
        const filename = `${uuidv4()}${extension}`;
        const filePath = path.join(folderPath, filename);
        
        const file = fs.createWriteStream(filePath);
        
        protocol.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(filename);
            });
            
            file.on('error', (err) => {
                fs.unlink(filePath, () => {}); // Delete the file if there's an error
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Function to ensure directory exists
function ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

  async function main(){
    const app = express();
    app.use(express.json())
    
    // Serve static files
    app.use(express.static(path.join(__dirname, '..')));
    
    // Serve the main HTML file
    app.get('/', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    });


    app.post("/generate", async (req: Request<{}, {}, GenerateRequest>, res: Response) => {

        const url = req.body?.url;
        const myImage = req.body?.myImage;

        if(!url || (url && url.trim() == "")){
            return res.status(403).json({error: "url is required"})
        }

        if(!myImage || (myImage && myImage.trim() == "")){
            return res.status(403).json({error: "myImage is required"})
        }

        console.log("URL is ", url, "myImage is", req.body?.myImage);

        try {
            //Start the browser and get the URLs
            const imageURLs = await extractFromPage(url);
            
            // Ensure the product-images directory exists
            const productImagesDir = path.join(__dirname, '..', 'data', 'product-images');
            ensureDirectoryExists(productImagesDir);
            
            // Download and save all images
            const savedImages: Array<{originalUrl: string, savedPath: string, savedFilename: string}> = [];
            for (const imageUrl of imageURLs) {
                try {
                    const filename = await downloadAndSaveImage(imageUrl, productImagesDir);
                    savedImages.push({
                        originalUrl: imageUrl,
                        savedFilename: filename,
                        savedPath: path.join('data', 'product-images', filename)
                    });
                    console.log(`Successfully saved image: ${filename}`);
                } catch (error) {
                    console.error(`Failed to save image ${imageUrl}:`, error);
                    // Continue with other images even if one fails
                }
            }

            if(savedImages.length === 0){
                throw new Error("No image was saved error!")
            }

            const firstSavedImage = savedImages[0];
            if (!firstSavedImage || !firstSavedImage.savedFilename) {
                throw new Error("No valid saved image found!")
            }

            // Check if user wants to use conversational approach
            const useConversational = req.query.conversational === 'true';
            
            let result;
            if (useConversational) {
                console.log("Using conversational approach for image generation");
                result = await generateImageConversational(myImage, firstSavedImage.savedFilename);
            } else {
                console.log("Using standard approach for image generation");
                result = await generateImage(myImage, firstSavedImage.savedFilename);
            }

            if(!result){
                res.status(403).json({error: "Some error occured. Please retry!"})
                return;
            }
            
            res.json({
                generatedImageUrl: result,
                productImageUrl: `/data/product-images/${firstSavedImage.savedFilename}`
            });
        } catch (error) {
            console.error("Error extracting from page:", error);
            res.status(500).json({error: "Failed to extract data from the page"})
        }

    })

    app.post("/upload-photos", upload.array('photos', 10), async (req: Request, res: Response) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No files uploaded" });
            }

            const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                mimetype: file.mimetype
            }));

            res.json({ 
                message: "Files uploaded successfully",
                files: uploadedFiles,
                count: uploadedFiles.length
            });
        } catch (error) {
            console.error("Error uploading files:", error);
            res.status(500).json({ error: "Failed to upload files" });
        }
    });

    // Serve uploaded and generated images
    app.get('/data/:filename', (req: Request, res: Response) => {
        const filename = req.params.filename;
        if (!filename) {
            return res.status(400).json({ error: "Filename is required" });
        }
        
        const filePath = path.join(__dirname, '..', 'data', filename);
        
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ error: "File not found" });
        }
    });

    // Error handling middleware for multer
    app.use((error: any, req: Request, res: Response, next: any) => {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: "File too large. Maximum size is 10MB" });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ error: "Too many files. Maximum is 10 files" });
            }
            return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Only image files are allowed') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    });

    app.listen(3000, () => {
        console.log("App is running!")
    })

  }

  main();