import React, { useState, useCallback, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import { LECTURES, LectureSidebar, LectureMain } from "./LectureLibrary";
import LandingPage from "./LandingPage";

// Groq writes math as \[ ... \] and \( ... \), but remark-math only
// recognizes $$ ... $$ and $ ... $ -- convert before rendering.
function normalizeMathDelimiters(text) {
  if (!text) return text;
  let normalized = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  return normalized;
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

// Sometimes Groq quotes lecture text that had a matched $$ ... $$ pair
// originally, but drops the OPENING $$ while keeping the closing one
// (partial quoting). This leaves an unmatched $$ that remark-math
// then pairs with some unrelated LATER $$ in the message, sweeping
// everything in between into one broken math block. Detect an odd
// count of $$ and neutralize the leftover one so it can't do that.
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

// Extracted + memoized: React only re-renders a specific message
// (and re-runs its Markdown/KaTeX parsing) when ITS OWN props change,
// not whenever ANY message in the list updates.
const MessageBubble = memo(function MessageBubble({ msg, isCopied, onCopy, onFeedback, onRetry }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-zinc-800 rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] text-zinc-100">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="text-zinc-100 max-w-[85%] md:max-w-[75%] leading-relaxed prose prose-invert prose-sm max-w-none">
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
        <div className="flex items-center gap-3 mt-2 text-zinc-500">
          <button
            onClick={() => onCopy(msg.id, msg.text)}
            title="Copy"
            className="hover:text-zinc-200 transition-colors"
          >
            {isCopied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          <button
            onClick={() => onFeedback(msg.id, "up")}
            title="Good response"
            className={`transition-colors ${
              msg.feedback === "up" ? "text-green-400" : "hover:text-zinc-200"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={msg.feedback === "up" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          <button
            onClick={() => onFeedback(msg.id, "down")}
            title="Bad response"
            className={`transition-colors ${
              msg.feedback === "down" ? "text-red-400" : "hover:text-zinc-200"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={msg.feedback === "down" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
              <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
            </svg>
          </button>

          <button
            onClick={() => onRetry(msg.id)}
            title="Retry"
            className="hover:text-zinc-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

// Reads the "token" query param from the current URL, if present.
// This is what tells App.jsx whether the user just arrived from a
// password reset email link, before any other component renders.
function getResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function App() {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay state

  // --- Auth state (3.7c) ---
  const [currentUser, setCurrentUser] = useState(null); // { id, email } or null if logged out
  const [authChecked, setAuthChecked] = useState(false); // true once we've checked /auth/me at least once
  const [authModal, setAuthModal] = useState(null); // "login" | "signup" | "forgot" | null

  // --- Persistent chat history (Step 7) ---
  const [conversations, setConversations] = useState([]);

  // --- Lecture library view toggle ---
  // No react-router in this app -- views are switched with local state,
  // same pattern as authModal below. When true, the sidebar shows the
  // lecture list (instead of conversations) and the main area shows the
  // video/doubt panel (instead of the chat), inside this SAME layout --
  // not a separate full-screen page.
  const [showLectures, setShowLectures] = useState(false);
  const [activeLecture, setActiveLecture] = useState(LECTURES[0] ?? null);
  const [doubtOpen, setDoubtOpen] = useState(false);
  // true once a lecture has been picked -- collapses the sidebar entirely
  // (at every screen size, not just mobile) so the video goes full-screen.
  // The "(hamburger)" button inside LectureMain reopens the sidebar as an overlay
  // using the same sidebarOpen state the mobile menu already uses.
  const [videoFocusMode, setVideoFocusMode] = useState(false);

  // Shows the entry/landing page first, before the actual chat app.
  // Clicking its button reveals the app below (matches the resetToken
  // pattern below - a full-screen replacement rather than a route).
  const [showLandingPage, setShowLandingPage] = useState(true);

  // --- Password reset state (3.10.4d) ---
  // Read once, on initial render, whether the URL contains a reset token.
  // This decides whether to show the full-page ResetPassword screen
  // INSTEAD OF the normal chat app.
  const [resetToken] = useState(getResetTokenFromUrl);

  // Check login status once when the app first loads, so a returning
  // user with a valid access_token cookie is recognized automatically.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`/api/auth/me`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.logged_in) {
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Failed to check auth status:", err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Fetch the sidebar's conversation list whenever login state changes.
  // Anonymous users never see a history list, matching the fact that
  // nothing gets persisted for them on the backend either.
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    } else {
      setConversations([]);
    }
  }, [currentUser, fetchConversations]);

  // Loads one past conversation's full messages into the chat view.
  // This is a read-only replay of history -- sending a new message
  // afterward continues the browser's LIVE session (and its own
  // conversation_id on the backend), not this one being viewed.
  const handleSelectConversation = useCallback(async (conversationId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();

      const loadedMessages = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.content,
        isStreaming: false,
        feedback: null,
        timestamp: new Date(m.created_at).toLocaleString(),
      }));

      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
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

      // Instead of rendering each network chunk the instant it arrives,
      // we push received text into a queue and drain it on a fixed
      // interval -- this paces the VISIBLE reveal speed independently
      // of how fast Groq actually sent the data, so fresh answers feel
      // as smooth and readable as cached ones.
      let pendingQueue = "";
      let accumulatedText = "";
      let isDone = false;

      const REVEAL_CHARS_PER_TICK = 3; // tune for faster/slower feel
      const REVEAL_INTERVAL_MS = 20;

      const revealInterval = setInterval(() => {
        if (pendingQueue.length === 0) {
          if (isDone) {
            clearInterval(revealInterval);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            );
          }
          return;
        }

        const take = pendingQueue.slice(0, REVEAL_CHARS_PER_TICK);
        pendingQueue = pendingQueue.slice(REVEAL_CHARS_PER_TICK);
        accumulatedText += take;

        const textSoFar = accumulatedText;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: textSoFar } : m
          )
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

      // The turn is fully persisted on the backend by this point (Step 5) --
      // refresh the sidebar so a new conversation appears, or an existing
      // one's position/timestamp updates, without a manual page reload.
      if (currentUser) {
        fetchConversations();
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: `\u26A0\uFE0F ${err.message}`, isStreaming: false }
            : m
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
      {
        id: assistantId,
        role: "assistant",
        text: "",
        isStreaming: true,
        feedback: null,
        timestamp: "just now",
      },
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

  // Wrapped in useCallback so these functions keep the SAME reference
  // across App re-renders -- required for React.memo on MessageBubble
  // to actually work (otherwise every App render would hand each
  // MessageBubble a "new" onCopy/onFeedback/onRetry function, which
  // defeats memo since props would look different every time).
  const handleCopy = useCallback((id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleFeedback = useCallback((id, type) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, feedback: m.feedback === type ? null : type } : m
      )
    );
  }, []);

  const handleRetry = useCallback((id) => {
    // Find the user message right before this assistant message, so we
    // can re-send the same question through the real streaming pipeline.
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      const userText = index > 0 ? prev[index - 1].text : null;

      if (userText) {
        streamFromBackend(id, userText);
      }

      return prev.map((m) => (m.id === id ? { ...m, text: "", isStreaming: true } : m));
    });
  }, []);

  // Resets the BACKEND session too (not just the visible message list),
  // so a fresh conversation actually starts at the DAG root again --
  // without this, "New chat" was only cosmetic on the frontend.
  const handleNewChat = useCallback(async () => {
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    try {
      await fetch(`/api/new-chat`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to reset backend session:", err);
    }
  }, []);

  // --- Auth handlers (3.7c) ---
  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user);
    setAuthModal(null);
  }, []);

  const handleSignupSuccess = useCallback(() => {
    // Signup doesn't log the user in automatically (no cookie is set),
    // so prompt them to log in next with their new credentials.
    setAuthModal("login");
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    setCurrentUser(null);
    setMenuOpen(false);
  }, []);

  // --- Password reset handler (3.10.4d) ---
  // After a successful reset, clear the token from the URL (so refreshing
  // doesn't re-show this screen) and prompt the user to log in.
  const handleResetSuccess = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
    window.location.reload();
  }, []);

  // If the URL contains a reset token, show ONLY the reset password
  // screen -- nothing else in the app renders until this is done.
  if (resetToken) {
    return <ResetPassword token={resetToken} onSuccess={handleResetSuccess} />;
  }

  // Entry page, shown before the chat app itself. Checked after
  // resetToken (a password-reset link should never be blocked by this)
  // but before everything else.
  if (showLandingPage) {
    return <LandingPage onEnter={() => setShowLandingPage(false)} />;
  }

  // Same pattern as resetToken above, but for lectures we render inline
  // below (sidebar + main content both branch on showLectures) rather
  // than returning a whole separate page.

  const hasMessages = messages.length > 0;

  const LectureToggleButton = showLectures ? (
    <button
      onClick={() => {
        setShowLectures(false);
        setVideoFocusMode(false);
        setSidebarOpen(false);
      }}
      aria-label="Back to chat"
      className="flex items-center justify-center w-9 h-9 mb-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-200"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  ) : (
    <button
      onClick={() => {
        setShowLectures(true);
        setVideoFocusMode(false);
        setSidebarOpen(false);
      }}
      className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
    >
      <span className="text-lg leading-none">{"\u{1F4DA}"}</span>
      Lectures
    </button>
  );

  const JeeaiTitle = (
    <div>
      <button
        onClick={() => setShowLandingPage(true)}
        aria-label="Back to home"
        className="mb-1 flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <button
          onClick={() => setShowLandingPage(true)}
          className="text-lg font-semibold hover:text-zinc-300 transition-colors"
        >
          JEEAI
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-zinc-400 hover:text-zinc-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );

  const SidebarContent = (
    <>
      {showLectures ? (
        <>
          {LectureToggleButton}
          {JeeaiTitle}
        </>
      ) : (
        <>
          {JeeaiTitle}
          {LectureToggleButton}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
          >
            <span className="text-lg leading-none">+</span>
            New chat
          </button>
        </>
      )}

      <nav className="flex-1 overflow-y-auto -mx-3 space-y-1">
        {showLectures ? (
          <LectureSidebar
            lectures={LECTURES}
            activeId={activeLecture?.id}
            onSelect={(lec) => {
              setActiveLecture(lec);
              setVideoFocusMode(true);
              setSidebarOpen(false);
            }}
          />
        ) : !authChecked ? null : currentUser ? (
          conversations.length > 0 &&
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                activeConversationId === conv.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {conv.title}
            </button>
          ))
        ) : null}
      </nav>

      <div className="relative mt-2">
        {!authChecked ? null : currentUser ? (
          <>
            {menuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                <div className="p-3 border-b border-zinc-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-semibold">
                      {currentUser.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium truncate">{currentUser.email}</div>
                      <div className="text-xs text-zinc-400">Free</div>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  {["Upgrade plan", "Personalization", "Profile", "Settings"].map(
                    (item) => (
                      <button
                        key={item}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                <div className="border-t border-zinc-700 py-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors">
                    Help
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-semibold shrink-0">
                {currentUser.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-sm font-medium truncate">{currentUser.email}</div>
                <div className="text-xs text-zinc-400">Free</div>
              </div>
            </button>
          </>
        ) : (
          <button
            onClick={() => setAuthModal("login")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            Log in
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      {!videoFocusMode && (
        <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col p-3 shrink-0">
          {SidebarContent}
        </aside>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-zinc-900 border-r border-zinc-800 flex flex-col p-3 z-10">
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {!videoFocusMode && (
          <div className="md:hidden flex items-center gap-3 px-3 py-3 border-b border-zinc-800">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-300 hover:text-zinc-100"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button onClick={() => setShowLandingPage(true)} className="text-sm font-semibold hover:text-zinc-300 transition-colors">JEEAI</button>
          </div>
        )}

        {showLectures ? (
          <LectureMain
            activeLecture={activeLecture}
            doubtOpen={doubtOpen}
            setDoubtOpen={(open) => {
              setDoubtOpen(open);
              // Opening the doubt bot collapses the lecture-list sidebar
              // too, so only one panel is ever open at a time.
              if (open) setVideoFocusMode(true);
            }}
            showSidebarToggle={videoFocusMode}
            onOpenSidebar={() => {
              setSidebarOpen(true);
              setDoubtOpen(false);
            }}
            onConversationSaved={currentUser ? fetchConversations : undefined}
          />
        ) : (
          <>
            {!hasMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <h1 className="text-2xl md:text-3xl font-medium text-zinc-200 mb-8 text-center">
                  What's on the agenda today?
                </h1>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4">
                <div className="max-w-2xl mx-auto py-8 space-y-6">
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

            <div className="w-full flex justify-center px-3 md:px-4 pb-6 md:pb-8">
              <div className="w-full max-w-2xl flex items-center gap-2 md:gap-3 bg-zinc-800 rounded-full px-4 md:px-5 py-3">
                <button className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none">
                  +
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
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
          </>
        )}
      </main>

      {authModal === "login" && (
        <Login
          onClose={() => setAuthModal(null)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setAuthModal("signup")}
          onForgotPassword={() => setAuthModal("forgot")}
        />
      )}

      {authModal === "signup" && (
        <Signup
          onClose={() => setAuthModal(null)}
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthModal("login")}
        />
      )}

      {authModal === "forgot" && (
        <ForgotPassword
          onClose={() => setAuthModal(null)}
          onSwitchToLogin={() => setAuthModal("login")}
        />
      )}
    </div>
  );
}

export default App;
