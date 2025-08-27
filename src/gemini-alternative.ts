import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";
import {config} from "dotenv"
import { randomUUID } from "node:crypto";

config();

export async function generateImageConversational(myImage: string, productImage: string) {
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

  console.log("Processing images with conversational approach:", { myImage, productImage });

  try {
    // Step 1: Initialize the conversation
    console.log("Step 1: Initializing conversation...");
    const initResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { text: "Hi! I need your help with virtual try-on. I want to see how clothing looks on a person. Can you help me with that?" }
      ],
    });

    console.log("Initial response received");

    // Step 2: Upload the person's image
    console.log("Step 2: Uploading person's image...");
    const personResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { text: "Great! Here's a photo of the person who wants to try on clothing:" },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        { text: "This is the person. Can you see them clearly?" }
      ],
    });

    console.log("Person image uploaded");

    // Step 3: Upload the clothing product image
    console.log("Step 3: Uploading clothing product image...");
    const clothingResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { text: "Perfect! Now here's the clothing item they want to try on:" },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: productBase64Image,
          },
        },
        { text: "This is the clothing product. Can you see the design and style clearly?" }
      ],
    });

    console.log("Clothing image uploaded");

    // Step 4: Request the try-on generation
    console.log("Step 4: Requesting try-on generation...");
    const finalResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { text: "Excellent! Now I want you to create a realistic image where the person from the first photo is wearing the clothing from the second photo. " +
                "Please make sure the clothing fits naturally on their body, maintains the original design and color, and looks like a real photo. " +
                "Generate the try-on image now." }
      ],
    });

    console.log("Final request sent");

    // Process the final response for the generated image
    if (!finalResponse?.candidates?.[0]?.content?.parts) {
      throw new Error("Invalid final response structure");
    }

    const parts = finalResponse.candidates[0].content.parts;
    console.log("Number of final response parts:", parts.length);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      if (part.inlineData?.data) {
        console.log(`Generated image found in part ${i + 1}`);
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const uniqueId = randomUUID();
        const filename = `gemini-conversational-${uniqueId}.png`;
        const filepath = `./data/edited/${filename}`;
        fs.writeFileSync(filepath, buffer); 
        console.log(`Conversational approach image saved as ${filename}`);
        return filepath;
      }
    }

    console.error("No image generated in conversational approach");
    return null;

  } catch (error) {
    console.error("Error in conversational approach:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    throw error;
  }
}
