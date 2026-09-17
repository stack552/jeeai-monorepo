import React, { useState, useCallback, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * ChatPanel.jsx
 * -------------
 * A narrower, self-contained version of the chat UI from App.jsx --
 * same backend endpoint (/api/chat), same SSE streaming + reveal-pacing
 * logic, same markdown/KaTeX rendering. Built as its own component
 * (rather than editing App.jsx's internals) so your existing full-page
 * chat keeps working exactly as it does today, untouched.
 *
 * No local "Past Questions" history here -- every question already gets
 * saved to the backend (same as the main chat), and onConversationSaved
 * tells App.jsx to refresh its sidebar so it shows up there too. That's
 * the single source of truth for history now.
 *
 * PROPS:
 * - lectureTitle (optional): shown as a small placeholder line.
 * - onConversationSaved (optional): called after each answer finishes,
 *   so App.jsx can refresh its conversation list.
 */

function normalizeMathDelimiters(text) {
  if (!text) return text;
  let normalized = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  return normalized;
}

function sanitizeStrayDollarSigns(text) {
  if (!text) return text;
  const matches = [...text.matchAll(/\$\$/g)];
  if (matches.length % 2 !== 0) {
    const last = matches[matches.length - 1];
    const index = last.index;
    text = text.slice(0, index) + "\\$\\$" + text.slice(index + 2);
  }
  return text;
}

// LLMs sometimes emit table rows all on one line, or use <br> tags
// inside cells instead of real line breaks -- react-markdown needs an
// actual newline before each "| ... |" row to parse a table correctly.
function fixTableFormatting(text) {
  if (!text) return text;
  let fixed = text.replace(/<br\s*\/?>/gi, "; ");
  fixed = fixed.replace(/\|(?!\n)\s*\|/g, "|\n|");
  return fixed;
}

const MessageBubble = memo(function MessageBubble({ msg, isCopied, onCopy, onFeedback, onRetry }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-zinc-800 rounded-2xl px-3 py-2 max-w-[90%] text-zinc-100 text-sm">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="text-zinc-100 max-w-[95%] leading-relaxed prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#71717a" }]]}
        >
          {sanitizeStrayDollarSigns(fixTableFormatting(normalizeMathDelimiters(msg.text)))}
        </ReactMarkdown>
        {msg.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-1 animate-pulse align-middle" />
        )}
      </div>

      {!msg.isStreaming && (
        <div className="flex items-center gap-2.5 mt-1.5 text-zinc-500">
          <button onClick={() => onCopy(msg.id, msg.text)} title="Copy" className="hover:text-zinc-200 transition-colors">
            {isCopied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          <button
            onClick={() => onFeedback(msg.id, "up")}
            title="Good response"
            className={`transition-colors ${msg.feedback === "up" ? "text-green-400" : "hover:text-zinc-200"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={msg.feedback === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          <button
            onClick={() => onFeedback(msg.id, "down")}
            title="Bad response"
            className={`transition-colors ${msg.feedback === "down" ? "text-red-400" : "hover:text-zinc-200"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={msg.feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
              <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
            </svg>
          </button>

          <button onClick={() => onRetry(msg.id)} title="Retry" className="hover:text-zinc-200 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>

          <span className="text-xs">{msg.timestamp}</span>
        </div>
      )}
    </div>
  );
});

export default function ChatPanel({ lectureTitle, onConversationSaved }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // A fresh doubt session shares the SAME backend session cookie as the
  // main chat -- without resetting it here, the first question would just
  // get appended onto whatever conversation was already active there,
  // instead of starting its own. This silent reset is what makes each
  // doubt-panel session start as its own distinct, separately-titled
  // conversation in the main sidebar.
  useEffect(() => {
    fetch(`/api/new-chat`, {
      method: "POST",
      credentials: "include",
    }).catch((err) => console.error("Failed to reset backend session:", err));
  }, []);

  const streamFromBackend = async (assistantId, userMessageText) => {
    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessageText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const detail = errorData?.detail || `Server responded with ${res.status}`;
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let pendingQueue = "";
      let accumulatedText = "";
      let isDone = false;

      const REVEAL_CHARS_PER_TICK = 3;
      const REVEAL_INTERVAL_MS = 20;

      const revealInterval = setInterval(() => {
        if (pendingQueue.length === 0) {
          if (isDone) {
            clearInterval(revealInterval);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
            );
          }
          return;
        }

        const take = pendingQueue.slice(0, REVEAL_CHARS_PER_TICK);
        pendingQueue = pendingQueue.slice(REVEAL_CHARS_PER_TICK);
        accumulatedText += take;

        const textSoFar = accumulatedText;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: textSoFar } : m))
        );
      }, REVEAL_INTERVAL_MS);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop();

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = JSON.parse(event.slice(6));

          if (payload.error) {
            clearInterval(revealInterval);
            throw new Error(payload.error);
          }

          if (payload.done) {
            isDone = true;
            continue;
          }

          if (payload.text) {
            pendingQueue += payload.text;
          }
        }
      }

      // The reader loop above can end because the server sent a proper
      // "done" signal, OR because the connection just closed/dropped
      // without ever sending one (network hiccup, backend cutting off
      // early). Either way, once we reach here the stream is over -- so
      // always finalize isDone, rather than only trusting payload.done.
      // Without this, a dropped connection left the message stuck in
      // "streaming" state forever, with no code path left to clear it.
      isDone = true;

      // The turn is now persisted on the backend (same /api/chat endpoint
      // the main chat uses), so tell App.jsx to refresh its conversation
      // list -- that's how this question shows up in the main sidebar too.
      if (onConversationSaved) {
        onConversationSaved();
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, text: `\u26A0\uFE0F ${err.message}`, isStreaming: false } : m
        )
      );
    }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: "user", text: trimmed };
    const assistantId = Date.now() + 1;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", text: "", isStreaming: true, feedback: null, timestamp: "just now" },
    ]);
    setInputValue("");

    await streamFromBackend(assistantId, trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = useCallback((id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleFeedback = useCallback((id, type) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
  }, []);

  const handleRetry = useCallback((id) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      const userText = index > 0 ? prev[index - 1].text : null;
      if (userText) streamFromBackend(id, userText);
      return prev.map((m) => (m.id === id ? { ...m, text: "", isStreaming: true } : m));
    });
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-zinc-950">
      {!hasMessages ? (
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <p className="text-xl font-medium text-zinc-200">
            Ask anything about{lectureTitle ? ` "${lectureTitle}"` : " this lecture"}.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <div className="py-6 space-y-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isCopied={copiedId === msg.id}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </div>
      )}

      <div className="w-full flex justify-center px-3 pb-6">
        <div className="w-full flex items-center gap-2 bg-zinc-800 rounded-full px-4 py-3">
          <button className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none">
            +
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a doubt..."
            className="flex-1 bg-transparent outline-none placeholder:text-zinc-500 text-zinc-100 min-w-0"
          />
          <button className="hidden sm:block text-zinc-400 hover:text-zinc-200 transition-colors text-sm">
            Think
          </button>
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
