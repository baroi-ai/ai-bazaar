import { NextResponse } from "next/server";
import PocketBase from 'pocketbase';
import { fal } from "@fal-ai/client";

// Configure Fal AI (Ensure FAL_KEY is in your .env file)
fal.config({
  credentials: process.env.FAL_KEY,
});

const ALLOWED_MODELS = new Set([
  "fal-ai/nano-banana-2/edit",
  "fal-ai/topaz/upscale/image",
]);

export async function POST(req: Request) {
  try {
    // 1. Check for Authentication Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authenticate securely with PocketBase
    const pb = new PocketBase("http://127.0.0.1:8090");
    pb.authStore.save(authHeader, null); // Load user token from client

    let user;
    try {
      user = await pb.collection('users').authRefresh();
    } catch (e) {
      return NextResponse.json({ error: "Invalid Session" }, { status: 401 });
    }

    const { modelId, input } = await req.json();

    // 3. Validate Inputs & Calculate Cost
    if (!ALLOWED_MODELS.has(modelId)) {
      return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });
    }

    const requestedScale = Number(input.scale) || 2;
    const is4K = requestedScale >= 4;
    let cost = 10;

    if (modelId === "fal-ai/nano-banana-2/edit") cost = is4K ? 20 : 10;
    if (modelId === "fal-ai/topaz/upscale/image") cost = is4K ? 12 : 8;

    // 4. Verify User Credits
    const currentCredits = user.record.credits || 0;
    if (currentCredits < cost) {
      return NextResponse.json(
        { error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    if (!input.image_data) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 5. Prepare Fal AI Payload
    let falInput: any = {};
    
    switch (modelId) {
      case "fal-ai/nano-banana-2/edit":
        falInput = {
          prompt: "upscale image to high quality, masterpiece, 8k resolution",
          num_images: 1,
          aspect_ratio: "auto",
          output_format: "png",
          image_url: input.image_data, // Accepting Base64 directly
          resolution: is4K ? "4K" : "2K",
        };
        break;

      case "fal-ai/topaz/upscale/image":
        falInput = {
          image_url: input.image_data,
          model: "Standard V2",
          upscale_factor: requestedScale,
          output_format: "jpeg",
        };
        break;
    }

    console.log(`🚀 Requesting Fal: ${modelId} | Cost: ${cost} coins`);

    // 6. Generate via Fal AI
    const result: any = await fal.subscribe(modelId, {
      input: falInput,
      logs: true,
    });

    // Extract Result URL
    let remoteImageUrl = result.data?.images?.[0]?.url || result.data?.image?.url || result.data?.url;
    if (!remoteImageUrl) throw new Error("Upscaling failed: No image returned by Fal.");

    // 7. Deduct Credits in PocketBase
    const newCreditBalance = currentCredits - cost;
    await pb.collection('users').update(user.record.id, {
      credits: newCreditBalance
    });

    // 8. (Optional) Log Generation in PocketBase
    // Make sure you have an "imageGenerations" collection in PB to save history
    try {
      await pb.collection('imageGenerations').create({
        user: user.record.id,
        model: modelId,
        cost: cost,
        imageUrl: remoteImageUrl,
        status: "completed"
      });
    } catch (dbError) {
      console.error("Failed to log generation in DB, but upscale succeeded.", dbError);
    }

    // 9. Send success back to UI
    return NextResponse.json({
      success: true,
      imageUrl: remoteImageUrl,
      remainingCredits: newCreditBalance,
    });

  } catch (error: any) {
    console.error("🚨 API Upscale Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}