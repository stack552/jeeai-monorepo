import { useEffect, useRef, useState } from "react";

// Real projectile-motion numbers (not decorative) - the same formulas
// taught in Lectures 51-60: v = u - gt, h = ut - (1/2)gt^2.
// vx=40, vy0=30 gives a launch angle of atan(30/40) = 36.87 degrees,
// the classic 3-4-5 triangle angle used constantly in these problems.
const VX = 40; // m/s, horizontal (constant)
const VY0 = 30; // m/s, initial vertical
const G = 10; // m/s^2
const FLIGHT_TIME = (2 * VY0) / G; // 6s - time of flight
const MAX_HEIGHT = (VY0 * VY0) / (2 * G); // 45m

// Screen-space endpoints for the visual arc. A parabola stays a parabola
// under this kind of linear remap, so the ball's position is just the
// same quadratic bezier used for the static guide curve, parametrized
// by the real simulated time - it always sits exactly on the drawn arc.
const P0 = { x: 40, y: 260 };
const P1 = { x: 300, y: -40 };
const P2 = { x: 560, y: 260 };

function bezierPoint(t) {
  const mt = 1 - t;
  return {
    x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
    y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
  };
}

// Cannon fires, ball flies for FLIGHT_TIME simulated seconds, pauses
// briefly, then fires again - one continuous, orchestrated loop rather
// than scattered effects.
const SIM_SPEED = 1.7; // compress 6s of flight into a snappier ~3.5s
const PAUSE_SECONDS = 0.9;

export default function LandingPage({ onEnter }) {
  const [simTime, setSimTime] = useState(0); // 0..FLIGHT_TIME, or -PAUSE..0 during pause
  const [reducedMotion, setReducedMotion] = useState(false);
  const frameRef = useRef(null);
  const lastTsRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const deltaSeconds = ((ts - lastTsRef.current) / 1000) * SIM_SPEED;
      lastTsRef.current = ts;

      setSimTime((prev) => {
        let next = prev + deltaSeconds;
        if (next > FLIGHT_TIME) {
          next = -PAUSE_SECONDS;
        }
        return next;
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [reducedMotion]);

  const inFlight = simTime >= 0;
  const t = Math.max(0, Math.min(simTime, FLIGHT_TIME));
  const ballVisualT = t / FLIGHT_TIME;
  const ballPos = reducedMotion ? bezierPoint(0.5) : bezierPoint(ballVisualT);

  const launchAngleDeg = (Math.atan2(VY0, VX) * 180) / Math.PI;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-16" style={{ backgroundColor: "#0A0E17" }}>
      <div className="w-full max-w-xl flex flex-col items-center text-center">
        <div className="mb-2 text-2xl font-bold tracking-wide" style={{ color: "#5EEAD4" }}>
          JEEAI
        </div>

        <svg viewBox="0 0 600 300" className="w-full max-w-md mb-8" aria-hidden="true">
          <line x1="20" y1="260" x2="580" y2="260" stroke="#1F2937" strokeWidth="2" strokeDasharray="4 6" />
          <line x1="300" y1="30" x2="300" y2="260" stroke="#1F2937" strokeWidth="1" strokeDasharray="3 5" />

          <path d="M 40 260 Q 300 -40 560 260" fill="none" stroke="#5EEAD4" strokeWidth="2.5" opacity="0.35" />

          {/* Cannon, angled to the real launch angle (36.87 degrees) */}
          <g transform={`translate(40 260) rotate(${-launchAngleDeg})`}>
            <rect x="-6" y="-9" width="46" height="18" rx="4" fill="#374151" />
            <circle cx="-6" cy="0" r="14" fill="#1F2937" />
          </g>

          {/* Ball, hidden during the reload pause */}
          {(reducedMotion || inFlight) && (
            <circle cx={ballPos.x} cy={ballPos.y} r="7" fill="#F5A623" />
          )}
        </svg>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5" style={{ color: "#E8EAF0" }}>
          Ask it now.
          <br />
          Not after the exam.
        </h1>

        <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-md" style={{ color: "#9AA3B5" }}>
          Learn at your own pace and ask doubts.
        </p>

        <button
          onClick={onEnter}
          className="px-8 py-3.5 rounded-full font-semibold text-base transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ backgroundColor: "#F5A623", color: "#0A0E17" }}
        >
          Ask a doubt
        </button>
      </div>
    </div>
  );
}
