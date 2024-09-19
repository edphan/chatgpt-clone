"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setChat((prevChat) => [...prevChat, userMessage]);
    setInput(""); 
    setIsBotTyping(true);

    try {
      const messages = [...chat, userMessage];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Network response was not ok");
      }

      setChat((prevChat) => [...prevChat, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsBotTyping(false);
              return;
            }
            try {
              const content = JSON.parse(data);
              botContent += content;

              setChat((prevChat) => {
                const updatedChat = [...prevChat];
                const lastIndex = updatedChat.length - 1;
                updatedChat[lastIndex] = {
                  role: "assistant",
                  content: botContent,
                };
                return updatedChat;
              });
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }
      setIsBotTyping(false);
    } catch (error) {
      console.error("Error fetching response:", error);
      setIsBotTyping(false);
      setChat((prevChat) => prevChat.filter((msg) => msg.role !== "assistant"));
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 10,
          height: 400,
          overflowY: "auto",
        }}
      >
        {chat.map((msg, index) => (
          <div key={index} style={{ margin: "10px 0" }}>
            <strong>{msg.role === "user" ? "You" : "Bot"}:</strong>{" "}
            {msg.content}
          </div>
        ))}
        {isBotTyping && (
          <div>
            <strong>Bot:</strong> <em>Typing...</em>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter prompt"
          style={{ width: "80%", padding: 10, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{
            padding: 10,
            marginLeft: 10,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
