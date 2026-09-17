import { useState, useMemo, useEffect } from "react";
import ChatPanel from "./ChatPanel";

/**
 * LectureLibrary.jsx
 * -------------------
 * Save into src/LectureLibrary.jsx (same folder as App.jsx).
 * App.jsx doesn't use react-router — it's state-toggled — so this page
 * is switched into view the same way (see the App.jsx patch instructions).
 *
 * WHAT YOU STILL NEED TO FILL IN:
 * 1. `LECTURES` array below — fill in your real 68 titles + YouTube video IDs.
 *    (Just the 11-char ID from the URL, e.g. https://youtu.be/XXXXXXXXXXX)
 *
 * ChatPanel (the doubt bot) is already wired in — see ChatPanel.jsx.
 *
 * DESIGN NOTES:
 * - Sidebar is virtualization-free since 68 items is small enough to just
 *   render directly — no need for react-window etc.
 * - The YouTube player uses a plain <iframe> with the standard embed URL.
 *   Unlisted videos embed fine as long as embedding isn't disabled on the
 *   video itself (check that in YouTube Studio > video > embedding).
 * - The doubt panel is NOT an overlay — clicking "Ask Doubt" resizes the
 *   layout so the video area shrinks to 70% width and a 30%-wide chat
 *   panel appears alongside it (not on top of it). Video keeps playing
 *   the whole time since it's just a CSS width change, not an unmount.
 * - Mobile: sidebar collapses into a "Lectures" toggle button since a
 *   3-column layout doesn't fit small screens.
 */

// -----------------------------------------------------------------------
// 1. YOUR LECTURE DATA — replace with the real 68
// -----------------------------------------------------------------------
export const LECTURES = [
  { id: "l1", title: "Kinematics Lecture 1 : Introduction to Rest and Motion", youtubeId: "359RL_Slmws" },
  { id: "l2", title: "Kinematics Lecture 2: Distance and Displacement || Ekalavya", youtubeId: "cdAikVg8XhY" },
  { id: "l3", title: "Kinematics Lecture 3: Average Speed", youtubeId: "Cs0p1QyEa7A" },
  { id: "l4", title: "Kinematics Lecture 4 : Instantaneous Speed", youtubeId: "tfKHEDLUAMY" },
  { id: "l5", title: "Kinematics Lecture 5: Average Velocity", youtubeId: "eCN8ksHsEps" },
  { id: "l6", title: "Kinematics Lecture 6: Instantaneous Velocity", youtubeId: "mGBQWYtN8tA" },
  { id: "l7", title: "Kinematics Lecture 7 : Average acceleration || Ekalavya", youtubeId: "E9BbSyue9zw" },
  { id: "l8", title: "Kinematics Lecture 8 : Instantaneous acceleration", youtubeId: "kZL-ACTZfvo" },
  { id: "l9", title: "Kinematics Lecture 9 : Position-time(s-t) graph", youtubeId: "UqlUHNsEv4w" },
  { id: "l10", title: "Kinematics Lecture 10 : velocity - time (v-t) graph part 1", youtubeId: "1Fd77UXb0rM" },
  { id: "l11", title: "Kinematics Lecture 11 : velocity-time(v-t) graph part 2", youtubeId: "Fpd71416apo" },
  { id: "l12", title: "Kinematics Lecture 12 : Acceleration - time (a-t) graph", youtubeId: "2--dJYkNIkE" },
  { id: "l13", title: "Kinematics Lecture 13: Solved Example 1", youtubeId: "52tj3jXW1dg" },
  { id: "l14", title: "Kinematics Lecture 14 : solved example 2", youtubeId: "Qg28BR26b80" },
  { id: "l15", title: "Kinematics Lecture 15: solved example 3", youtubeId: "J0YrSZzcO6A" },
  { id: "l16", title: "Kinematics Lecture 16 : solved example 4", youtubeId: "cBFFjnUPLb4" },
  { id: "l17", title: "Kinematics Lecture 17 : solved example 5", youtubeId: "6FM91mo-78M" },
  { id: "l18", title: "Kinematics Lecture 18 : solved example 6", youtubeId: "PwEayT4ozUo" },
  { id: "l19", title: "Kinematics Lecture 19 : solved example 7", youtubeId: "YDKHuzJgLw0" },
  { id: "l20", title: "Kinematics Lecture 20 : solved example 8 || Ekalavya", youtubeId: "xtHGqkokTDQ" },
  { id: "l21", title: "Kinematics Lecture 21 : solved example 9 || Ekalavya", youtubeId: "Yl7Oez0Hj5U" },
  { id: "l22", title: "Kinematics Lecture 22 : solved example 10 || Ekalavya", youtubeId: "o40BYfRb8QU" },
  { id: "l23", title: "Kinematics Lecture 23 : Relative velocity || Ekalavya", youtubeId: "wy3JV4HV30E" },
  { id: "l24", title: "Kinematics Lecture 24 : Resultant velocity || Ekalavya", youtubeId: "7U6STCgkUhY" },
  { id: "l25", title: "Kinematics Lecture 25 : solved example 11", youtubeId: "axgQLgnPFcQ" },
  { id: "l26", title: "Kinematics Lecture 26 : solved problem 17", youtubeId: "JKroSIpCMCM" },
  { id: "l27", title: "Kinematics Lecture 27 : solved example 13 || Ekalavya", youtubeId: "PgtMGz6qnU0" },
  { id: "l28", title: "Kinematics Lecture 28: solved example 14", youtubeId: "hICJauAZOw8" },
  { id: "l29", title: "Kinematics Lecture 29 : solved example 15", youtubeId: "_EEUFp2ktbw" },
  { id: "l30", title: "Kinematics Lecture 30 : solved example 16", youtubeId: "k49aoaZltck" },
  { id: "l31", title: "Kinematics Lecture 31 :  non uniform straight line motion || Ekalavya", youtubeId: "2GkM6Ms_bKE" },
  { id: "l32", title: "Kinematics Lecture 32 : Equations of motion in straight line || Ekalavya", youtubeId: "MV_oWBxjGwY" },
  { id: "l33", title: "Kinematics Lecture 33 : proof of v = u + at || Ekalavya", youtubeId: "1I8vee__wUM" },
  { id: "l34", title: "Kinematics Lecture 34 :  s = ut + (1/2)at²", youtubeId: "9AXGZydT2Yo" },
  { id: "l35", title: "Kinematics Lecture 35 : proof of v² - u² = 2as || Ekalavya", youtubeId: "aX-6IK2whns" },
  { id: "l36", title: "Kinematics Lecture 36 : Equations of motion in straight line || Ekalavya", youtubeId: "LJiYy8Zxa7Q" },
  { id: "l37", title: "Kinematics Lecture 37 : solved problem 18 || Ekalavya", youtubeId: "YBhIpL048F0" },
  { id: "l38", title: "Kinematics Lecture 38 : solved example 19 || Ekalavya", youtubeId: "8Ls5HJnzDGU" },
  { id: "l39", title: "Kinematics Lecture 39 : Freely falling body part 1 || Ekalavya", youtubeId: "fSEQaRQZnAE" },
  { id: "l40", title: "Kinematics Lecture 40 : Freely falling body part 2 || Ekalavya", youtubeId: "Za66-nuFvp8" },
  { id: "l41", title: "Kinematics Lecture 41 : Freely falling body part 3 || Ekalavya", youtubeId: "dFPG0n41u0c" },
  { id: "l42", title: "Kinematics Lecture 42 : Freely falling body part 4 || Ekalavya", youtubeId: "1GXGksZ3dCw" },
  { id: "l43", title: "Kinematics Lecture 43 : solved example 20 || Ekalavya", youtubeId: "1AkjSuwyGjg" },
  { id: "l44", title: "Kinematics Lecture 44 : solved example 21 || Ekalavya", youtubeId: "1y21CjmRhEY" },
  { id: "l45", title: "Kinematics Lecture 45 : solved example 22 || Ekalavya", youtubeId: "Y3E3HnsHtY0" },
  { id: "l46", title: "Kinematics Lecture 46 : solved example 23 || Ekalavya", youtubeId: "_X3cmWAHj9S" },
  { id: "l47", title: "Kinematics Lecture 47 : solved example 24 || Ekalavya", youtubeId: "_AWBMTUxRI0" },
  { id: "l48", title: "Kinematics Lecture 48 : solved example 25 || Ekalavya", youtubeId: "MbSIKn2q4bg" },
  { id: "l49", title: "Kinematics Lecture 49 : solved example 26 || Ekalavya", youtubeId: "dKvSk8Z_xqs" },
  { id: "l50", title: "Kinematics Lecture 50 : solved example 27 || Ekalavya", youtubeId: "lRNzBpth25A" },
  { id: "l51", title: "Kinematics Lecture 51 : Projectile motion part 1 || Ekalavya", youtubeId: "HG9WpmtBimk" },
  { id: "l52", title: "Kinematics Lecture 52 : Projectile motion part 2 || Ekalavya", youtubeId: "oPm8kGkgafo" },
  { id: "l53", title: "Kinematics Lecture 53 : Projectile motion part 3", youtubeId: "pg8eER-uePY" },
  { id: "l54", title: "Kinematics Lecture 54 : Time of flight of Projectile", youtubeId: "zXvzBR6qWOU" },
  { id: "l55", title: "Kinematics Lecture 55 : Maximum Height of Projectile", youtubeId: "eUpcbPPHjco" },
  { id: "l56", title: "Kinematics Lecture 56 : Range of a projectile", youtubeId: "evL8Ko8jVXA" },
  { id: "l57", title: "Kinematics Lecture 57 : Equation of Trajectory", youtubeId: "lQdK8nj33tg" },
  { id: "l58", title: "Kinematics Lecture 58 : Time of ascent", youtubeId: "xyHY0u8OUzE" },
  { id: "l59", title: "Kinematics Lecture 59 : Time of Descent", youtubeId: "pPXI8Yltpi8" },
  { id: "l60", title: "Kinematics Lecture 60 : Horizantal projectile motion", youtubeId: "Vgcyzfem0tI" },
  { id: "l61", title: "Kinematics Lecture 61 : solved example 28", youtubeId: "OiPNK4Fpwqk" },
  { id: "l62", title: "Kinematics Lecture 62 : solved example 29", youtubeId: "UmRYhs-RkpI" },
  { id: "l63", title: "Kinematics Lecture 63 : Solved example 30", youtubeId: "2ACWb5C_Lt0" },
  { id: "l64", title: "Kinematics Lecture 64 : solved example 31", youtubeId: "k4CnrC5Wlgc" },
  { id: "l65", title: "Kinematics Lecture 65 : solved example 32", youtubeId: "RbFXIBfgcr8" },
  { id: "l66", title: "Kinematics Lecture 66 : solved example 33", youtubeId: "TKrfeBmPM7M" },
  { id: "l67", title: "Kinematics Lecture 67 : solved example 34", youtubeId: "PWbewxFThQU" },
  { id: "l68", title: "Kinematics Lecture 68 : solved example 35", youtubeId: "7ndU4xNwRIw" },
];

// -----------------------------------------------------------------------
// 2. Sidebar — searchable list of lecture titles
// -----------------------------------------------------------------------
export function LectureSidebar({ lectures, activeId, onSelect, onClose }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return lectures;
    const q = query.toLowerCase();
    return lectures.filter((l) => l.title.toLowerCase().includes(q));
  }, [lectures, query]);

  return (
    <div className="flex h-full w-full flex-col bg-neutral-900 text-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-800 p-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-300">
          Lectures ({lectures.length})
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white md:hidden"
            aria-label="Close lecture list"
          >
            {"\u2715"}
          </button>
        )}
      </div>

      <div className="p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lectures..."
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.map((lec, idx) => {
          const isActive = lec.id === activeId;
          return (
            <li key={lec.id}>
              <button
                onClick={() => onSelect(lec)}
                className={`mb-1 flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-xs text-neutral-500">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="line-clamp-2">{lec.title}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-neutral-500">
            No lectures match "{query}"
          </li>
        )}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------
// 3. Video player — plain YouTube iframe embed
// -----------------------------------------------------------------------
function VideoPlayer({ lecture }) {
  if (!lecture) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        Select a lecture to begin
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative w-full flex-1 bg-black">
        <iframe
          key={lecture.youtubeId} // forces reload when switching videos
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${lecture.youtubeId}?rel=0&modestbranding=1`}
          title={lecture.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="border-t border-neutral-800 bg-neutral-950 p-3 text-center">
        <h1 className="text-base font-medium text-neutral-100">{lecture.title}</h1>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// 4. Doubt panel — inline 30%-width panel, sits beside the video (not over
//    it). No local "Past Questions" history here — the main sidebar's
//    conversation list (backend-persisted, via onConversationSaved)
//    already covers that, so this stays a plain, stateless-on-close panel.
// -----------------------------------------------------------------------
function DoubtPanel({ onClose, currentLecture, onConversationSaved }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex h-full w-full flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <span className="px-1 text-base font-semibold text-zinc-100">JEEAI</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Close doubt panel"
        >
          {"\u2715"}
        </button>
      </div>

      <div className="relative min-w-0 min-h-0 flex-1">
        <ChatPanel lectureTitle={currentLecture?.title} onConversationSaved={onConversationSaved} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// 5. Lecture main area — video + doubt panel, NO sidebar of its own.
//    Meant to be dropped into App.jsx's existing <main> in place of the
//    chat message list, while App.jsx's own sidebar shows the lecture
//    list (via the LectureSidebar export above) instead of conversations.
// -----------------------------------------------------------------------
export function LectureMain({ activeLecture, doubtOpen, setDoubtOpen, showSidebarToggle, onOpenSidebar, onConversationSaved }) {
  return (
    <div className="flex h-full min-w-0 flex-1">
      <div
        className={`relative min-w-0 transition-all duration-300 ${
          doubtOpen ? "w-[70%]" : "w-full"
        }`}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
          {showSidebarToggle ? (
            <button
              onClick={onOpenSidebar}
              className="rounded-md bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 backdrop-blur hover:bg-zinc-800"
              aria-label="Open lecture list"
            >
              {"\u2630"}
            </button>
          ) : (
            <span />
          )}

          {!doubtOpen && (
            <button
              onClick={() => setDoubtOpen(true)}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-indigo-500"
            >
              {"\u{1F4AC} Ask Doubt"}
            </button>
          )}
        </div>

        <VideoPlayer lecture={activeLecture} />
      </div>

      {doubtOpen && (
        <div className="w-[30%] shrink-0">
          <DoubtPanel
            onClose={() => setDoubtOpen(false)}
            currentLecture={activeLecture}
            onConversationSaved={onConversationSaved}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// 6. Standalone full page (kept for reference / other use) — combines
//    everything above into one self-contained page with its own overlay
//    sidebar. App.jsx no longer uses this default export directly; it
//    uses the LECTURES / LectureSidebar / LectureMain pieces above instead,
//    embedded into its existing layout.
// -----------------------------------------------------------------------
export default function LectureLibrary({ onBack }) {
  const [activeLecture, setActiveLecture] = useState(LECTURES[0] ?? null);
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      {/* Sidebar — floating overlay panel, closed by default, toggled from
          the "? Lectures" button. This applies at every screen size now,
          not just mobile — the video stays full-screen until you open it. */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transform shadow-2xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <LectureSidebar
          lectures={LECTURES}
          activeId={activeLecture?.id}
          onSelect={(lec) => {
            setActiveLecture(lec);
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content — video + doubt panel share this row, always full width */}
      <div className="flex h-full min-w-0">
        {/* Video area — 100% width normally, 70% when doubt panel is open */}
        <div
          className={`relative min-w-0 transition-all duration-300 ${
            doubtOpen ? "w-[70%]" : "w-full"
          }`}
        >
          {/* Top bar with mobile toggle + doubt button */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-md bg-neutral-900/80 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:bg-neutral-800"
                >
                  {"\u2190 Chat"}
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md bg-neutral-900/80 px-3 py-2 text-sm text-neutral-200 backdrop-blur hover:bg-neutral-800"
              >
                {"\u2630 Lectures"}
              </button>
            </div>
            {!doubtOpen && (
              <div className="ml-auto">
                <button
                  onClick={() => setDoubtOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-indigo-500"
                >
                  {"\u{1F4AC} Ask Doubt"}
                </button>
              </div>
            )}
          </div>

          <VideoPlayer lecture={activeLecture} />
        </div>

        {/* Doubt panel — 30% width, only takes space when open */}
        {doubtOpen && (
          <div className="w-[30%] shrink-0">
            <DoubtPanel
              onClose={() => setDoubtOpen(false)}
              currentLecture={activeLecture}
            />
          </div>
        )}
      </div>
    </div>
  );
}
