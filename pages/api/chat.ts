// pages/api/chat.js

import OpenAI from "openai";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js's default body parsing
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Collect the request body
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const bodyData = Buffer.concat(buffers).toString();

  let messages;
  try {
    const parsedBody = JSON.parse(bodyData);
    messages = parsedBody.messages;
  } catch (error) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  // Validate the request body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  // Initialize OpenAI API client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Set headers to enable streaming
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    // Create a chat completion with streaming
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or 'gpt-3.5-turbo'
      messages: messages,
      stream: true,
    });

    // Handle the streaming response
    for await (const part of completion) {
      const content = part.choices[0]?.delta?.content || "";
      console.log("Received content:", content);

      if (content) {
        res.write(`data: ${JSON.stringify(content)}\n\n`);
      }
    }

    // Signal the end of the stream
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "An error occurred while processing your request.",
    });
  }
}
