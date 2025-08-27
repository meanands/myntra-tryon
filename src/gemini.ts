import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";
import {config} from "dotenv"
import { text } from "body-parser";
import { randomUUID } from "node:crypto";

config();

export async function generateImage(myImage: string, productImage: string) {

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY as string});

  // Ensure the edited directory exists
  const editedDir = "./data/edited";
  if (!fs.existsSync(editedDir)) {
    fs.mkdirSync(editedDir, { recursive: true });
  }

  const imagePath = "./data/"+myImage;
  const productImagePath = "./data/product-images/"+productImage;
  
  // Validate that both images exist
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Person image not found: ${imagePath}`);
  }
  if (!fs.existsSync(productImagePath)) {
    throw new Error(`Product image not found: ${productImagePath}`);
  }

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");

  const productImageData = fs.readFileSync(productImagePath);
  const productBase64Image = productImageData.toString("base64");

  console.log("Processing images:", { myImage, productImage });
  console.log("Image paths:", { imagePath, productImagePath });
  console.log("Image sizes:", { 
    personImageSize: imageData.length, 
    productImageSize: productImageData.length 
  });

  const prompt = [
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
        data: base64Image,
      },
    },
    {
        text: "This is the person who wants to try on clothing. Now I'll upload the clothing product image:"
    },
    {
        inlineData: {
          mimeType: "image/jpeg",
          data: productBase64Image,
        },
    },
    {
        text: "This is the clothing product. Please create a realistic try-on image where the person from the first image is wearing the clothing from the second image. " +
              "Make sure the clothing fits naturally on the person's body, maintains the original design and color, and looks like a real photo. " +
              "Return the generated image only."
    }
  ];

  try {
    console.log("Sending request to Gemini with model: gemini-2.5-flash-image-preview");
    console.log("Prompt structure:", prompt.map(p => p.text ? `Text: ${p.text.substring(0, 50)}...` : 'Image data'));
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });

    console.log("Response received from Gemini");

    // Proper validation of the nested structure
    if (!response?.candidates?.[0]?.content?.parts) {
      console.error("Invalid response structure:", JSON.stringify(response, null, 2));
      throw new Error("Invalid response structure: missing candidates, content, or parts");
    }

    const parts = response.candidates[0].content.parts;

    // Validate that parts is an array
    if (!Array.isArray(parts)) {
      console.error("Response parts is not an array:", typeof parts);
      throw new Error("Response parts is not an array");
    }

    console.log("Number of response parts:", parts.length);

    let textResponses = [];
    let imageFound = false;
    let generatedImagePath = null;

    // Process each part with proper validation
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        console.warn(`Skipping null/undefined part at index ${i}`);
        continue;
      }

      if (part.text) {
        console.log(`Text response ${i + 1}:`, part.text);
        textResponses.push(part.text);
      } else if (part.inlineData?.data) {
        console.log(`Image data found in part ${i + 1}`);
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const uniqueId = randomUUID();
        const filename = `gemini-generated-${uniqueId}.png`;
        const filepath = `./data/edited/${filename}`;
        fs.writeFileSync(filepath, buffer); 
        console.log(`Generated image saved as ${filename}`);
        imageFound = true;
        generatedImagePath = filepath;
        break; // Exit after finding the first image
      } else {
        console.warn(`Unknown part type at index ${i}:`, Object.keys(part));
      }
    }

    if (!imageFound) {
      console.error("No image was generated in the response");
      console.error("Text responses received:", textResponses);
      console.error("This might be because:");
      console.error("1. Gemini is not configured for image generation");
      console.error("2. The model doesn't support image generation");
      console.error("3. The prompt was not clear enough");
      console.error("4. The images were not processed correctly");
      return null;
    }

    console.log("Successfully generated try-on image:", generatedImagePath);
    return generatedImagePath;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    throw error;
  }
}