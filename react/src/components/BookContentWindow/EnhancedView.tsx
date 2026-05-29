// import React, { useState, useEffect } from "react";
// import { useLocation } from "wouter";
// import {
//   motion,
//   AnimatePresence,
//   useMotionValue,
//   useTransform,
//   useSpring,
// } from "framer-motion";

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface ChapterData {
//   id: number | string;
//   title: string;
//   enhancedContent: string;
//   bookTitle: string;
// }

// // ─── EnhancedView ─────────────────────────────────────────────────────────────
// // Standalone route: /enhanced-view
// // Reads from: sessionStorage.getItem("enhancedChapter")
// // Navigate here from BookContentWindow after saving data to sessionStorage

// const EnhancedView: React.FC = () => {
//   const [, navigate] = useLocation();
//   const [chapter, setChapter] = useState<ChapterData | null>(null);
//   const [notFound, setNotFound] = useState(false);
//   const [currentSpread, setCurrentSpread] = useState(0);
//   const [isFlipping, setIsFlipping] = useState(false);
//   const [flipDir, setFlipDir] = useState<"next" | "prev">("next");

//   // 3D mouse tilt
//   const mx = useMotionValue(0);
//   const my = useMotionValue(0);
//   const sx = useSpring(mx, { stiffness: 60, damping: 20 });
//   const sy = useSpring(my, { stiffness: 60, damping: 20 });
//   const rotX = useTransform(sy, [-0.5, 0.5], [2.5, -2.5]);
//   const rotY = useTransform(sx, [-0.5, 0.5], [-4, 4]);

//   // Load chapter data from sessionStorage on mount
//   useEffect(() => {
//     const raw = sessionStorage.getItem("enhancedChapter");
//     if (!raw) {
//       setNotFound(true);
//       return;
//     }
//     try {
//       setChapter(JSON.parse(raw) as ChapterData);
//     } catch {
//       setNotFound(true);
//     }
//   }, []);

//   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
//     const r = e.currentTarget.getBoundingClientRect();
//     mx.set((e.clientX - r.left) / r.width - 0.5);
//     my.set((e.clientY - r.top) / r.height - 0.5);
//   };
//   const handleMouseLeave = () => {
//     mx.set(0);
//     my.set(0);
//   };

//   const handleBack = () => navigate("/bookExpanded");

//   // Parse a single content line into heading or paragraph JSX
//   const renderLine = (line: string, i: number, isFirstOnPage: boolean) => {
//     const t = line.trim();
//     const isHeading =
//       t.startsWith("###") ||
//       (t.length < 65 &&
//         !t.endsWith(".") &&
//         !t.endsWith(",") &&
//         i !== 0 &&
//         t.split(" ").length <= 7);
//     const cleaned = t.replace(/^###\s*/, "").replace(/\*\*/g, "");
//     if (isHeading) return <h3 key={i} className="ev-heading">{cleaned}</h3>;
//     return (
//       <p key={i} className={`ev-para${isFirstOnPage && i === 0 ? " ev-para-first" : ""}`}>
//         {cleaned}
//       </p>
//     );
//   };

//   const goNext = () => {
//     if (isFlipping) return;
//     setFlipDir("next");
//     setIsFlipping(true);
//     setTimeout(() => { setCurrentSpread(1); setIsFlipping(false); }, 500);
//   };

//   const goPrev = () => {
//     if (isFlipping) return;
//     setFlipDir("prev");
//     setIsFlipping(true);
//     setTimeout(() => { setCurrentSpread(0); setIsFlipping(false); }, 500);
//   };

//   // ── Not found ──
//   if (notFound) {
//     return (
//       <div style={{ minHeight: "100vh", background: "#0f0e17", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", fontFamily: "sans-serif" }}>
//         <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
//           No enhanced content found.
//         </p>
//         <button onClick={handleBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "0.5rem 1.4rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>
//           ← Back to Books
//         </button>
//       </div>
//     );
//   }

//   // ── Loading ──
//   if (!chapter) {
//     return (
//       <div style={{ minHeight: "100vh", background: "#0f0e17", display: "flex", alignItems: "center", justifyContent: "center" }}>
//         <div style={{ width: "36px", height: "36px", border: "2px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "evSpin 0.9s linear infinite" }} />
//         <style>{`@keyframes evSpin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     );
//   }

//   // ── Compute spread content ──
//   const lines = chapter.enhancedContent.split("\n").filter((p) => p.trim() !== "");
//   const mid = Math.ceil(lines.length / 2);
//   const leftLines = lines.slice(0, mid);
//   const rightLines = lines.slice(mid);
//   const hasTwoSpreads = rightLines.length > 0;
//   const spreadLeft = currentSpread === 0 ? leftLines : rightLines;
//   const spreadRight = currentSpread === 0 ? rightLines : [];

//   // ─────────────────────────────────────────────────────────────────────────────
//   return (
//     <motion.div
//       className="ev-root"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       transition={{ duration: 0.4 }}
//     >
//       {/* Atmospheric background */}
//       <div className="ev-bg">
//         <div className="ev-bg-grid" />
//         <div className="ev-bg-glow ev-bg-glow-1" />
//         <div className="ev-bg-glow ev-bg-glow-2" />
//         <div className="ev-bg-glow ev-bg-glow-3" />
//       </div>

//       {/* Particles */}
//       <div className="ev-particles" aria-hidden="true">
//         {Array.from({ length: 18 }).map((_, i) => (
//           <span
//             key={i}
//             className="ev-particle"
//             style={{
//               left: `${5 + (i * 5.5) % 92}%`,
//               animationDelay: `${(i * 0.7) % 12}s`,
//               animationDuration: `${10 + (i * 1.3) % 8}s`,
//               width: `${1 + (i % 3)}px`,
//               height: `${1 + (i % 3)}px`,
//             }}
//           />
//         ))}
//       </div>

//       {/* ── Header ── */}
//       <motion.header
//         className="ev-header"
//         initial={{ y: -50, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ delay: 0.2, duration: 0.4 }}
//       >
//         <button className="ev-back-btn" onClick={handleBack}>
//           <span className="ev-back-icon">←</span>
//           <span className="ev-back-label">Back to Reader</span>
//         </button>

//         <div className="ev-header-center">
//           <span className="ev-ai-pill">
//             <span className="ev-ai-dot" />
//             AI Enhanced
//           </span>
//           <span className="ev-header-title">{chapter.title}</span>
//         </div>

//         <div className="ev-header-right">
//           {hasTwoSpreads && (
//             <span className="ev-spread-label">{currentSpread + 1} / 2</span>
//           )}
//         </div>
//       </motion.header>

//       {/* ── Book stage ── */}
//       <div
//         className="ev-stage"
//         onMouseMove={handleMouseMove}
//         onMouseLeave={handleMouseLeave}
//       >
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={currentSpread}
//             className="ev-book-tilt-wrapper"
//             style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
//             initial={{ opacity: 0, scale: 0.97, y: 16 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.97, y: -16 }}
//             transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
//           >
//             <div className="ev-book-shadow" />
//             <div className="ev-book">
//               <div className="ev-cover-edge ev-cover-edge-left" />

//               {/* LEFT PAGE */}
//               <div className="ev-page ev-page-left">
//                 <div className="ev-page-lines" aria-hidden="true" />

//                 {currentSpread === 0 && (
//                   <div className="ev-chapter-header">
//                     <div className="ev-chapter-eyebrow">
//                       <span className="ev-ai-tag">✦ AI Enhanced</span>
//                       <span className="ev-chapter-num">Chapter {chapter.id}</span>
//                     </div>
//                     <h1 className="ev-chapter-title">{chapter.title}</h1>
//                     <div className="ev-title-divider">
//                       <span />
//                       <span className="ev-title-divider-dot">◆</span>
//                       <span />
//                     </div>
//                   </div>
//                 )}

//                 <div className="ev-page-content">
//                   {spreadLeft.map((line, i) => renderLine(line, i, currentSpread === 0))}
//                 </div>

//                 <footer className="ev-page-footer">
//                   <span className="ev-footer-book">{chapter.bookTitle}</span>
//                   <span className="ev-footer-pg">{currentSpread === 0 ? "I" : "III"}</span>
//                 </footer>
//               </div>

//               {/* SPINE */}
//               <div className="ev-spine">
//                 <div className="ev-spine-inner" />
//                 <div className="ev-spine-highlight" />
//               </div>

//               {/* RIGHT PAGE */}
//               <div className={`ev-page ev-page-right${isFlipping ? ` ev-flipping-${flipDir}` : ""}`}>
//                 <div className="ev-page-lines" aria-hidden="true" />

//                 <div className="ev-page-content ev-page-content-right">
//                   {spreadRight.map((line, i) => renderLine(line, i, false))}
//                   {spreadRight.length === 0 && currentSpread === 1 && (
//                     <div className="ev-end-ornament">
//                       <span>✦ ✦ ✦</span>
//                       <p>End of Enhanced Content</p>
//                     </div>
//                   )}
//                 </div>

//                 {spreadRight.length > 0 && (
//                   <div className="ev-quote-block">
//                     <div className="ev-quote-mark">"</div>
//                     <p className="ev-quote-text">
//                       The mind is not a vessel to be filled, but a fire to be kindled.
//                     </p>
//                     <p className="ev-quote-attr">— Plutarch</p>
//                   </div>
//                 )}

//                 <footer className="ev-page-footer ev-page-footer-right">
//                   <span className="ev-footer-pg">{currentSpread === 0 ? "II" : "IV"}</span>
//                   <span className="ev-footer-book">AI Enhanced View</span>
//                 </footer>
//                 <div className="ev-page-curl" />
//               </div>

//               <div className="ev-cover-edge ev-cover-edge-right" />
//             </div>
//           </motion.div>
//         </AnimatePresence>
//       </div>

//       {/* ── Navigation ── */}
//       <motion.div
//         className="ev-nav"
//         initial={{ y: 40, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ delay: 0.3 }}
//       >
//         {hasTwoSpreads && (
//           <button
//             className="ev-nav-btn"
//             onClick={goPrev}
//             disabled={currentSpread === 0 || isFlipping}
//           >
//             ‹ Previous
//           </button>
//         )}

//         <button className="ev-close-btn" onClick={handleBack}>
//           ← Back to Book
//         </button>

//         {hasTwoSpreads && (
//           <button
//             className="ev-nav-btn"
//             onClick={goNext}
//             disabled={currentSpread === 1 || isFlipping}
//           >
//             Next ›
//           </button>
//         )}
//       </motion.div>

//       <style>{EV_STYLES}</style>
//     </motion.div>
//   );
// };

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const EV_STYLES = `
// @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;1,8..60,300;1,8..60,400&family=DM+Sans:wght@300;400;500&display=swap');

// .ev-root {
//   position: fixed; inset: 0; z-index: 5000;
//   display: flex; flex-direction: column; overflow: hidden;
//   font-family: 'DM Sans', sans-serif;
// }

// /* Background */
// .ev-bg { position: absolute; inset: 0; background: #0f0e17; z-index: 0; overflow: hidden; }
// .ev-bg-grid {
//   position: absolute; inset: 0;
//   background-image:
//     linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
//     linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
//   background-size: 48px 48px;
// }
// .ev-bg-glow {
//   position: absolute; border-radius: 50%;
//   filter: blur(90px); opacity: 0.18;
//   animation: evGlowFloat ease-in-out infinite;
// }
// .ev-bg-glow-1 { width:500px; height:500px; background:#4338ca; top:-120px; left:-100px; animation-duration:14s; }
// .ev-bg-glow-2 { width:350px; height:350px; background:#0ea5e9; bottom:-80px; right:-60px; animation-duration:11s; animation-delay:-5s; }
// .ev-bg-glow-3 { width:250px; height:250px; background:#8b5cf6; top:40%; right:20%; animation-duration:9s; animation-delay:-3s; opacity:0.1; }
// @keyframes evGlowFloat {
//   0%,100% { transform:translate(0,0) scale(1); }
//   50% { transform:translate(20px,-30px) scale(1.08); }
// }

// /* Particles */
// .ev-particles { position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden; }
// .ev-particle { position:absolute; bottom:-4px; border-radius:50%; background:rgba(148,163,184,0.35); animation:evParticleRise linear infinite; }
// @keyframes evParticleRise {
//   0% { transform:translateY(0); opacity:0; }
//   10% { opacity:1; }
//   90% { opacity:0.6; }
//   100% { transform:translateY(-100vh) translateX(20px); opacity:0; }
// }

// /* Header */
// .ev-header {
//   position:relative; z-index:100;
//   display:flex; align-items:center; justify-content:space-between;
//   padding:0.85rem 1.75rem;
//   background:rgba(15,14,23,0.85);
//   border-bottom:1px solid rgba(255,255,255,0.07);
//   backdrop-filter:blur(20px);
//   gap:1rem; flex-shrink:0;
// }
// .ev-back-btn {
//   display:flex; align-items:center; gap:0.5rem;
//   background:transparent; border:1px solid rgba(255,255,255,0.1);
//   color:rgba(255,255,255,0.55); padding:0.45rem 1rem;
//   border-radius:6px; cursor:pointer;
//   font-family:'DM Sans',sans-serif; font-size:0.78rem;
//   transition:all 0.25s; white-space:nowrap;
// }
// .ev-back-btn:hover { border-color:rgba(255,255,255,0.3); color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.05); }
// .ev-back-icon { font-size:1rem; transition:transform 0.2s; }
// .ev-back-btn:hover .ev-back-icon { transform:translateX(-3px); }
// .ev-back-label { font-size:0.75rem; letter-spacing:0.04em; }
// .ev-header-center { display:flex; align-items:center; gap:0.85rem; flex:1; justify-content:center; min-width:0; }
// .ev-ai-pill {
//   display:flex; align-items:center; gap:0.4rem;
//   background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35);
//   padding:0.3rem 0.75rem; border-radius:999px;
//   font-size:0.7rem; color:#a5b4fc; letter-spacing:0.06em; white-space:nowrap; flex-shrink:0;
// }
// .ev-ai-dot { width:6px; height:6px; border-radius:50%; background:#818cf8; box-shadow:0 0 6px #818cf8; animation:evDotPulse 2s ease-in-out infinite; }
// @keyframes evDotPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
// .ev-header-title {
//   font-family:'Playfair Display',serif; font-size:0.9rem;
//   color:rgba(255,255,255,0.65); font-style:italic;
//   overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;
// }
// .ev-header-right { min-width:80px; display:flex; justify-content:flex-end; }
// .ev-spread-label { font-size:0.72rem; color:rgba(255,255,255,0.3); letter-spacing:0.08em; }

// /* Stage */
// .ev-stage {
//   flex:1; display:flex; align-items:flex-start; justify-content:center;
//   padding:1.2rem 1.5rem 0.5rem; position:relative; z-index:10;
//   perspective:2200px; overflow-y:auto; overflow-x:hidden;
//   min-height:0;
// }
// .ev-book-tilt-wrapper { width:100%; max-width:1080px; position:relative; height:fit-content; }
// .ev-book-shadow { position:absolute; bottom:-30px; left:4%; width:92%; height:50px; background:rgba(0,0,0,0.65); filter:blur(28px); border-radius:50%; z-index:-1; }
// .ev-book { display:flex; position:relative; border-radius:3px 6px 6px 3px; align-items:stretch; width:100%; }

// /* Cover edges */
// .ev-cover-edge { position:absolute; top:0; bottom:0; width:18px; z-index:20; }
// .ev-cover-edge-left { left:-18px; background:linear-gradient(to right,#1e1b2e,#2a2640); box-shadow:-6px 0 20px rgba(0,0,0,0.7),inset -2px 0 6px rgba(0,0,0,0.4); border-radius:4px 0 0 4px; }
// .ev-cover-edge-right { right:-18px; background:linear-gradient(to left,#1e1b2e,#2a2640); box-shadow:6px 0 20px rgba(0,0,0,0.7),inset 2px 0 6px rgba(0,0,0,0.4); border-radius:0 4px 4px 0; }

// /* Pages */
// .ev-page {
//   flex:1; width:0;
//   background:#ffffff; padding:2.5rem 2.2rem 2rem;
//   position:relative; overflow:visible; display:flex; flex-direction:column;
//   height:auto;
// }
// .ev-page-left { border-right:1px solid rgba(0,0,0,0.08); box-shadow:inset -15px 0 30px rgba(0,0,0,0.04),0 0 0 1px rgba(0,0,0,0.04); border-radius:2px 0 0 2px; }
// .ev-page-right { box-shadow:0 0 0 1px rgba(0,0,0,0.04); transform-origin:left center; border-radius:0 2px 2px 0; transition:transform 0.55s cubic-bezier(0.645,0.045,0.355,1); }
// .ev-flipping-next { animation:evFlipNext 0.55s cubic-bezier(0.645,0.045,0.355,1) forwards; }
// .ev-flipping-prev { animation:evFlipPrev 0.55s cubic-bezier(0.645,0.045,0.355,1) forwards; }
// @keyframes evFlipNext {
//   0% { transform:perspective(1200px) rotateY(0deg); }
//   40% { box-shadow:-20px 0 40px rgba(0,0,0,0.15); }
//   50% { transform:perspective(1200px) rotateY(-90deg); }
//   100% { transform:perspective(1200px) rotateY(0deg); }
// }
// @keyframes evFlipPrev {
//   0% { transform:perspective(1200px) rotateY(0deg); }
//   30% { transform:perspective(1200px) rotateY(30deg); }
//   100% { transform:perspective(1200px) rotateY(0deg); }
// }
// .ev-page-lines { position:absolute; inset:0; pointer-events:none; background-image:repeating-linear-gradient(transparent 0px,transparent 27px,rgba(0,0,0,0.028) 27px,rgba(0,0,0,0.028) 28px); background-position:0 56px; }
// .ev-page-curl { position:absolute; bottom:0; right:0; width:32px; height:32px; background:linear-gradient(225deg,#f0f0f0 45%,rgba(0,0,0,0.08) 100%); clip-path:polygon(100% 0,100% 100%,0 100%); pointer-events:none; }

// /* Chapter header */
// .ev-chapter-header { margin-bottom:1.6rem; padding-bottom:1.2rem; border-bottom:1px solid rgba(0,0,0,0.08); flex-shrink:0; }
// .ev-chapter-eyebrow { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.65rem; }
// .ev-ai-tag { font-size:0.62rem; letter-spacing:0.15em; text-transform:uppercase; color:#6366f1; font-family:'DM Sans',sans-serif; font-weight:500; }
// .ev-chapter-num { font-size:0.62rem; letter-spacing:0.12em; text-transform:uppercase; color:#94a3b8; font-family:'DM Sans',sans-serif; }
// .ev-chapter-title { font-family:'Playfair Display',serif; font-size:clamp(1.2rem,2.5vw,1.75rem); font-weight:700; color:#0f172a; line-height:1.25; margin-bottom:0.85rem; }
// .ev-title-divider { display:flex; align-items:center; gap:0.5rem; }
// .ev-title-divider span:not(.ev-title-divider-dot) { flex:1; height:1px; background:linear-gradient(to right,transparent,rgba(99,102,241,0.25),transparent); }
// .ev-title-divider-dot { font-size:0.5rem; color:#6366f1; opacity:0.5; }

// /* Content */
// .ev-page-content { flex:0 0 auto; overflow:visible; position:relative; z-index:1; }
// .ev-page-content-right { padding-top:0.25rem; }
// .ev-heading { font-family:'Playfair Display',serif; font-size:0.8rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#4338ca; margin:1.4em 0 0.55em; padding-bottom:0.3em; border-bottom:1px solid rgba(99,102,241,0.15); }
// .ev-heading:first-child { margin-top:0; }
// .ev-para { font-family:'Source Serif 4',serif; font-size:clamp(0.82rem,1.4vw,0.97rem); line-height:1.85; color:#1e293b; text-align:justify; hyphens:auto; margin-bottom:0.9em; text-indent:1.3em; }
// .ev-para:first-of-type { text-indent:0; }
// .ev-para-first { text-indent:0 !important; }
// .ev-para-first::first-letter { font-family:'Playfair Display',serif; font-size:3rem; font-weight:700; float:left; line-height:0.78; margin:0.05em 0.1em 0 0; color:#4338ca; }

// /* Quote */
// .ev-quote-block { margin-top:1.5rem; padding:1rem 1.2rem; border-left:3px solid #e0e7ff; background:#f8faff; border-radius:0 6px 6px 0; margin-bottom:0; flex-shrink:0; }
// .ev-quote-mark { font-family:'Playfair Display',serif; font-size:2rem; color:#c7d2fe; line-height:1; margin-bottom:0.2rem; }
// .ev-quote-text { font-family:'Source Serif 4',serif; font-style:italic; font-size:0.88rem; color:#475569; line-height:1.65; margin-bottom:0.4rem; text-indent:0; text-align:left; }
// .ev-quote-attr { font-size:0.7rem; font-family:'DM Sans',sans-serif; color:#94a3b8; letter-spacing:0.06em; }

// /* End ornament */
// .ev-end-ornament { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:0.75rem; opacity:0.35; }
// .ev-end-ornament span { font-size:0.9rem; letter-spacing:0.8em; color:#6366f1; }
// .ev-end-ornament p { font-family:'DM Sans',sans-serif; font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; color:#64748b; text-indent:0; }

// /* Spine */
// .ev-spine { width:40px; flex-shrink:0; background:linear-gradient(90deg,#1e1c2e,#2e2a48,#1e1c2e); position:relative; z-index:15; box-shadow:inset -4px 0 12px rgba(0,0,0,0.4),inset 4px 0 12px rgba(0,0,0,0.4); }
// .ev-spine-inner { position:absolute; top:0; bottom:0; left:50%; transform:translateX(-50%); width:1px; background:linear-gradient(to bottom,transparent 5%,rgba(99,102,241,0.4) 30%,rgba(99,102,241,0.4) 70%,transparent 95%); }
// .ev-spine-highlight { position:absolute; top:0; left:50%; transform:translateX(-50%); width:3px; height:100%; background:linear-gradient(to bottom,transparent,rgba(99,102,241,0.25),transparent); filter:blur(3px); animation:evSpineGlow 3.5s ease-in-out infinite; }
// @keyframes evSpineGlow { 0%,100%{opacity:0.3} 50%{opacity:1} }

// /* Page footer */
// .ev-page-footer { 
//   position:relative; bottom:auto; left:auto; right:auto;
//   display:flex; align-items:center; justify-content:space-between; 
//   border-top:1px solid rgba(0,0,0,0.06); padding-top:0.6rem; 
//   margin-top:1.5rem; z-index:2; flex-shrink:0;
// }
// .ev-page-footer-right { flex-direction:row-reverse; }
// .ev-footer-book { font-family:'DM Sans',sans-serif; font-size:0.62rem; color:rgba(0,0,0,0.22); letter-spacing:0.04em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px; }
// .ev-footer-pg { font-family:'Playfair Display',serif; font-size:0.65rem; color:rgba(0,0,0,0.2); letter-spacing:0.12em; }

// /* Navigation */
// .ev-nav { position:relative; z-index:100; display:flex; align-items:center; justify-content:center; gap:1.5rem; padding:0.85rem 1.5rem 1.1rem; flex-shrink:0; }
// .ev-nav-btn { background:transparent; border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.45); padding:0.45rem 1.2rem; border-radius:6px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.78rem; letter-spacing:0.06em; transition:all 0.25s; }
// .ev-nav-btn:hover:not(:disabled) { border-color:rgba(99,102,241,0.5); color:#a5b4fc; background:rgba(99,102,241,0.08); }
// .ev-nav-btn:disabled { opacity:0.2; cursor:default; }
// .ev-close-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.55); padding:0.45rem 1.4rem; border-radius:6px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.78rem; transition:all 0.25s; letter-spacing:0.04em; }
// .ev-close-btn:hover { border-color:rgba(99,102,241,0.4); color:#a5b4fc; background:rgba(99,102,241,0.06); }

// /* ── Responsive ── */
// @media (max-width:1279px) {
//   .ev-book-tilt-wrapper { max-width:920px; }
//   .ev-page { padding:2rem 1.8rem 2rem; }
//   .ev-para { font-size:0.9rem; }
// }
// @media (max-width:1023px) {
//   .ev-header { padding:0.75rem 1.2rem; }
//   .ev-header-title { max-width:200px; font-size:0.82rem; }
//   .ev-stage { padding:1rem 1rem 0.5rem; }
//   .ev-book-tilt-wrapper { max-width:100%; }
//   .ev-page { padding:1.6rem 1.4rem 1.8rem; }
//   .ev-chapter-title { font-size:1.3rem; }
//   .ev-para { font-size:0.87rem; line-height:1.8; }
//   .ev-spine { width:28px; }
//   .ev-cover-edge { width:12px; }
//   .ev-cover-edge-left { left:-12px; }
//   .ev-cover-edge-right { right:-12px; }
// }
// @media (max-width:767px) {
//   .ev-header-title { display:none; }
//   .ev-back-label { display:none; }
//   .ev-back-btn { padding:0.4rem 0.65rem; }
//   .ev-book { flex-direction:column; border-radius:6px; }
//   .ev-spine { display:none; }
//   .ev-page { width:100%; padding:1.4rem 1.2rem 1.8rem; }
//   .ev-page-left { border-right:none; border-bottom:2px solid #e2e8f0; border-radius:6px 6px 0 0; box-shadow:none; }
//   .ev-page-right { border-radius:0 0 6px 6px; box-shadow:none; }
//   .ev-cover-edge { display:none; }
//   .ev-book-shadow { display:none; }
//   .ev-stage { padding:0.75rem 0.75rem 0.25rem; perspective:none; }
//   .ev-chapter-title { font-size:1.15rem; }
//   .ev-para { font-size:0.88rem; }
//   .ev-para-first::first-letter { font-size:2.4rem; }
//   .ev-nav { gap:0.75rem; padding:0.7rem 1rem 0.9rem; }
//   .ev-nav-btn { padding:0.4rem 0.9rem; font-size:0.72rem; }
//   .ev-close-btn { font-size:0.72rem; padding:0.4rem 1rem; }
// }
// @media (max-width:599px) {
//   .ev-header { padding:0.65rem 0.9rem; gap:0.5rem; }
//   .ev-spread-label { display:none; }
//   .ev-stage { padding:0.5rem 0.5rem 0.25rem; }
//   .ev-page { padding:1.1rem 1rem 1.5rem; }
//   .ev-chapter-title { font-size:1rem; }
//   .ev-para { font-size:0.84rem; line-height:1.75; text-align:left; hyphens:none; text-indent:0; }
//   .ev-para-first::first-letter { font-size:2rem; }
//   .ev-heading { font-size:0.72rem; }
//   .ev-quote-block { padding:0.8rem 0.9rem; }
//   .ev-quote-text { font-size:0.82rem; }
//   .ev-nav { flex-wrap:wrap; gap:0.5rem; padding:0.6rem 0.75rem 0.8rem; justify-content:center; }
//   .ev-nav-btn { flex:1; min-width:80px; text-align:center; }
//   .ev-close-btn { width:100%; text-align:center; order:-1; }
// }
// @media (max-width:380px) {
//   .ev-header { padding:0.55rem 0.7rem; }
//   .ev-ai-pill { display:none; }
//   .ev-page { padding:0.9rem 0.8rem 1.2rem; }
//   .ev-para { font-size:0.81rem; }
// }
// `;

// export default EnhancedView;

import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AIBot from "./AIBot";
import { useTheme } from "../../hooks/use-theme";
import { useToast } from "../../hooks/use-toast";
import { askHighlight, explainHighlight, summarizeHighlight } from "../../lib/gradeupApi";
import { buildApiUrl } from "../../lib/apiBase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChapterData {
  id: number | string;
  unitId?: string;
  title: string;
  enhancedContent: string;
  bookTitle: string;
  subject?: string;
  layout?: any[];
  sourceContent?: any;
  sectionTopics?: Array<{
    id: string;
    label: string;
    title: string;
    number?: string | null;
    anchor: string;
  }>;
}

// ─── PageDecoration (golden — identical structure to BCW, gold palette) ───────
const PageDecoration = ({ type, variant = 1, position = "top" }: any) => {
  const isTop = position === "top";
  const shapes: Record<string, string> = {
    wave:    "polygon(0% 0%, 100% 0%, 100% 60%, 80% 90%, 50% 70%, 20% 90%, 0% 60%)",
    curve:   "ellipse(100% 100% at 50% 0%)",
    corner:  isTop ? "polygon(0 0, 100% 0, 100% 20%, 0 80%)" : "polygon(0 20%, 100% 80%, 100% 100%, 0 100%)",
    organic: "circle(70% at 50% -10%)",
  };
  // Golden palette matching --deco-color-1..4 but amber/gold instead of blue
  const goldMap: Record<string, string> = { "1": "#c9a227", "2": "#e8c547", "3": "#a07c14", "4": "#d4af37" };
  const style: React.CSSProperties = {
    position: "absolute", left: 0, right: 0, height: "120px",
    backgroundColor: goldMap[String(variant)] || "#c9a227",
    opacity: 0.13, zIndex: 0, clipPath: shapes[type] || shapes.wave,
    pointerEvents: "none", ...(isTop ? { top: 0 } : { bottom: 0 }),
  };
  const accent: React.CSSProperties = {
    ...style, height: "130px", opacity: 0.07,
    backgroundColor: "#7c5c0e", transform: "translateY(5px) scaleX(1.1)", zIndex: -1,
  };
  return <><div style={accent} /><div style={style} /></>;
};

function pickImageCandidate(...values: any[]): string | null {
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = pickImageCandidate(...value);
      if (nested) return nested;
      continue;
    }
    if (typeof value === "object") {
      const nested = pickImageCandidate(
        value.url,
        value.src,
        value.image,
        value.imageUrl,
        value.thumbnail,
        value.thumbnailUrl,
        value.coverImage,
        value.coverImageUrl,
      );
      if (nested) return nested;
      continue;
    }
    const raw = String(value).trim();
    if (raw) return raw;
  }
  return null;
}

function resolveMediaUrl(value: any): string | null {
  const candidate = pickImageCandidate(value);
  return candidate ? buildApiUrl(candidate) : null;
}

function chunkLayout(layout: any[], chunkSize = 12) {
  const spreads: Array<{ left: any[]; right: any[] }> = [];
  for (let index = 0; index < layout.length; index += chunkSize * 2) {
    spreads.push({
      left: layout.slice(index, index + chunkSize),
      right: layout.slice(index + chunkSize, index + chunkSize * 2),
    });
  }
  return spreads.length ? spreads : [{ left: [], right: [] }];
}

// ─── EnhancedView ─────────────────────────────────────────────────────────────
const EnhancedView: React.FC = () => {
  const [, navigate] = useLocation();
  const [chapter, setChapter]   = useState<ChapterData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isDark = theme === 'dark';

  // page state
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping,    setIsFlipping]    = useState(false);
  const [direction,     setDirection]     = useState<"next"|"prev">("next");
  const [displaySpread, setDisplaySpread] = useState(0); // shown while flip animates

  // AI / highlights
  const [selectedText,    setSelectedText]    = useState("");
  const [aiQuery,         setAiQuery]         = useState("");
  const [aiResponse,      setAiResponse]      = useState("");
  const [aiMode,          setAiMode]          = useState<"ask" | "explain" | "summarize">("ask");
  const [isAiOpen,        setIsAiOpen]        = useState(false);
  const [isAiLoading,     setIsAiLoading]     = useState(false);
  const [isInsightsOpen,  setIsInsightsOpen]  = useState(false);
  const [highlights,      setHighlights]      = useState<{id:string;text:string;comment:string}[]>([]);
  const [menuPos,         setMenuPos]         = useState<{x:number;y:number}|null>(null);
  const [isCommentOpen,   setIsCommentOpen]   = useState(false);
  const [newHighText,     setNewHighText]     = useState("");
  const [isSidebarOpen,   setIsSidebarOpen]   = useState(false);

  const persistentSel = useRef("");
  const menuRef       = useRef<HTMLDivElement>(null);
  const commentRef    = useRef<HTMLTextAreaElement>(null);

  // Load sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("enhancedChapter");
    if (!raw) { setNotFound(true); return; }
    try { setChapter(JSON.parse(raw) as ChapterData); }
    catch { setNotFound(true); }
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuPos(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Page flip ─────────────────────────────────────────────────────────────
  const flip = (dir: "next"|"prev") => {
    if (isFlipping) return;
    const next = dir === "next" ? currentSpread + 1 : currentSpread - 1;
    if (next < 0 || (dir === "next" && !hasTwoSpreads)) return;
    setDirection(dir);
    setIsFlipping(true);
    setTimeout(() => {
      setDisplaySpread(next);
      setCurrentSpread(next);
      setIsFlipping(false);
    }, 600);
  };

  // ── Selection — BOTH pages via main-viewport ─────────────────────────────
  const handleMouseUp = () => {
    setTimeout(() => {
      const sel  = window.getSelection();
      const text = sel?.toString().trim();
      if (text && sel && sel.rangeCount > 0) {
        const range       = sel.getRangeAt(0);
        const canvas      = document.querySelector(".ev-scroll-canvas") as HTMLElement | null;
        const bookWrapper = document.querySelector(".ev-book-container-wrapper") as HTMLElement | null;
        const ancestor    = range.commonAncestorContainer;
        const inBook      = bookWrapper?.contains(ancestor);
        const inCanvas    = canvas?.contains(ancestor);
        if ((inBook || inCanvas) && canvas) {
          const rect       = range.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();
          setMenuPos({
            x: rect.left - canvasRect.left + rect.width / 2,
            y: rect.top  - canvasRect.top  + canvas.scrollTop - 70,
          });
          setSelectedText(text);
          persistentSel.current = text;
        }
      } else {
        setMenuPos(null);
        setSelectedText("");
        persistentSel.current = "";
      }
    }, 10);
  };

  // ── AI ─────────────────────────────────────────────────────────────────
  const handleAskAI = async (
    query: string,
    mode: "ask" | "explain" | "summarize" = "ask",
    explicitText?: string,
  ) => {
    if (!chapter?.unitId) {
      toast({
        title: "Genius Mode unavailable",
        description: "Unit context is missing for this chapter.",
        variant: "destructive",
      });
      return;
    }

    const selected = (explicitText || persistentSel.current || query).trim();
    setAiMode(mode);
    setAiQuery(query);
    setAiResponse("");
    setIsAiOpen(true);
    setIsAiLoading(true);
    setMenuPos(null);

    try {
      const response =
        mode === "summarize"
          ? await summarizeHighlight({
              unitId: chapter.unitId,
              highlightedText: selected,
            })
          : mode === "explain"
            ? await explainHighlight({
                unitId: chapter.unitId,
                highlightedText: selected,
              })
            : await askHighlight({
                unitId: chapter.unitId,
                highlightedText: selected,
                messages: [{ role: "user", content: query }],
              });

      const content =
        response?.summary ||
        response?.explanation ||
        response?.answer ||
        response?.response ||
        response?.reply ||
        response?.message ||
        "No response available.";

      setAiResponse(String(content));
    } catch (error: any) {
      setAiResponse("");
      toast({
        title: "AI request failed",
        description: error?.message || "Unable to process this Genius Mode request.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAIBotAction = (action: "highlight"|"explain"|"summarize"|"ask", text: string) => {
    const t = text || persistentSel.current;
    if (action === "highlight") {
      if (t) { setNewHighText(t); setIsCommentOpen(true); }
    } else if (action === "explain") {
      handleAskAI(`Explain in detail: "${t}"`, "explain", t);
    } else if (action === "summarize") {
      handleAskAI(`Summarize this passage: "${t}"`, "summarize", t);
    } else if (action === "ask") {
      if (t) handleAskAI(t, "ask", t);
      else setIsAiOpen(true);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#fcfcfd", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Inter, sans-serif" }}>
        <p style={{ color: "#c9a227", fontSize: 14 }}>No enhanced content found.</p>
        <button
          onClick={() => navigate("/bookExpanded")}
          style={{ background: "transparent", border: "1px solid #c9a227", color: "#c9a227", padding: "8px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          ← Back to Reader
        </button>
      </div>
    );
  }
  if (!chapter) {
    return (
      <div style={{ minHeight: "100vh", background: "#fcfcfd", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 120, height: 75, border: "4px solid #c9a227", borderRadius: "8px 20px 20px 8px", animation: "evFlipLoad 2.5s infinite ease-in-out" }} />
        <style>{`@keyframes evFlipLoad{0%{transform:rotateY(0)}50%{transform:rotateY(180deg)}100%{transform:rotateY(360deg)}}`}</style>
      </div>
    );
  }

  // ── Content splits ────────────────────────────────────────────────────────
  const layout = Array.isArray(chapter.layout) && chapter.layout.length
    ? chapter.layout
    : chapter.enhancedContent
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({ type: "text", content: line.trim() }));
  const allSpreads = chunkLayout(layout, 10);
  const hasTwoSpreads  = allSpreads.length > 1;
  const spread         = allSpreads[displaySpread] || allSpreads[0];
  const leftLines      = spread.left || [];
  const rightLines     = spread.right || [];

  // ── Render text line ──────────────────────────────────────────────────────
  const highlightText = (text: string, baseKey: string) => {
    let content: (string | React.ReactElement)[] = [text];
    highlights.forEach((highlight) => {
      const next: (string | React.ReactElement)[] = [];
      content.forEach((segment) => {
        if (typeof segment !== "string" || !highlight.text) {
          next.push(segment);
          return;
        }
        const parts = segment.split(highlight.text);
        parts.forEach((part, partIndex) => {
          next.push(part);
          if (partIndex < parts.length - 1) {
            next.push(
              <span key={`${baseKey}-${highlight.id}-${partIndex}`} className="ev-highlighted-text" title={highlight.comment}>
                {highlight.text}
              </span>,
            );
          }
        });
      });
      content = next;
    });
    return content;
  };

  const renderLine = (item: any, index: number) => {
    if (!item) return null;

    if (item.type === "heading1" || item.type === "heading2" || item.type === "heading3") {
      return (
        <p key={index} id={item.anchor} style={{ fontSize: item.type === "heading1" ? "1rem" : "0.7rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: item.type === "heading1" ? "none" : "uppercase", color: "var(--ev-accent)", marginTop: "1.4em", marginBottom: "0.5em", paddingBottom: "0.3em", borderBottom: "1px solid var(--ev-deco-border)" }}>
          {item.content}
        </p>
      );
    }

    if (item.type === "list" && Array.isArray(item.items)) {
      return (
        <ul key={index} style={{ margin: "0 0 18px 18px", lineHeight: 1.8 }}>
          {item.items.map((entry: string, entryIndex: number) => (
            <li key={`${index}-${entryIndex}`} style={{ marginBottom: 8 }}>
              {highlightText(entry, `li-${index}-${entryIndex}`)}
            </li>
          ))}
        </ul>
      );
    }

    if (item.type === "formula") {
      return (
        <pre key={index} style={{ whiteSpace: "pre-wrap", marginBottom: 18, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--ev-border)", background: "rgba(201,162,39,.08)", fontSize: "0.9rem" }}>
          {item.content}
        </pre>
      );
    }

    if (item.type === "table" && Array.isArray(item.rows)) {
      return (
        <div key={index} style={{ overflowX: "auto", marginBottom: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            {Array.isArray(item.headers) && item.headers.length ? (
              <thead>
                <tr>
                  {item.headers.map((header: string, headerIndex: number) => (
                    <th key={`${index}-h-${headerIndex}`} style={{ border: "1px solid var(--ev-border)", padding: "8px 10px", textAlign: "left" }}>{header}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {item.rows.map((row: string[], rowIndex: number) => (
                <tr key={`${index}-r-${rowIndex}`}>
                  {row.map((cell: string, cellIndex: number) => (
                    <td key={`${index}-c-${rowIndex}-${cellIndex}`} style={{ border: "1px solid var(--ev-border)", padding: "8px 10px", verticalAlign: "top" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (item.type === "image" || item.imageUrl || item.image || item.images || item.media) {
      const imageSrc = resolveMediaUrl(item.imageUrl || item.image || item.url || item.src || item.images || item.media);
      return (
        <figure key={index} style={{ margin: "0 0 20px" }}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.caption || chapter.title}
              style={{ width: "100%", borderRadius: 14, border: "1px solid var(--ev-border)", display: "block" }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div style={{ minHeight: 160, display: "grid", placeItems: "center", borderRadius: 14, border: "1px dashed var(--ev-border)", background: "rgba(201,162,39,.06)", color: "var(--ev-muted)" }}>
              Image unavailable
            </div>
          )}
          {item.caption ? <figcaption style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--ev-muted)", textAlign: "center" }}>{item.caption}</figcaption> : null}
        </figure>
      );
    }

    const text = String(item.content || "").trim();
    return (
      <p key={index} style={{ lineHeight: "1.9", fontSize: "1.0rem", marginBottom: "20px", textAlign: "justify" }}>
        {text ? highlightText(text, `p-${index}`) : "No content available for this section."}
      </p>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ev-root" data-theme={isDark ? "dark" : "light"}>

      {/* ── Context menu (rendered inside scroll-canvas via absolute pos) ── */}
      {/* Placed at root so it's above everything */}

      {/* ── AI Lab panel ── */}
      <aside className={`ev-ai-lab ev-glass ${isAiOpen ? "ev-open" : ""}`}>
        <div className="ev-lab-head">
          <h3>✨ AI Learning Lab</h3>
          <button onClick={() => setIsAiOpen(false)}>✕</button>
        </div>
        <div className="ev-lab-body">
          <div className="ev-query-ref">"{aiQuery.substring(0,120)}{aiQuery.length>120?"…":""}"</div>
          {isAiLoading ? (
            <div style={{ display:"flex", gap:6, alignItems:"center", color:"var(--ev-accent)", fontSize:13, padding:"10px 0" }}>
              {[0,1,2].map(i=>(
                <motion.div key={i} style={{width:6,height:6,borderRadius:"50%",background:"var(--ev-accent)"}}
                  animate={{opacity:[0.3,1,0.3]}} transition={{duration:1,repeat:Infinity,delay:i*0.2}} />
              ))}
              <span style={{marginLeft:4}}>
                {aiMode === "summarize" ? "Summarizing..." : aiMode === "explain" ? "Explaining..." : "Thinking..."}
              </span>
            </div>
          ) : aiResponse ? (
            <>
              <div className="ev-ai-card"><p>{aiResponse}</p></div>
              <button className="ev-btn-premium ev-sm" onClick={() => { setHighlights(h=>[...h,{id:`${Date.now()}`,text:aiQuery.substring(0,60),comment:aiResponse.substring(0,80)}]); }}>
                Save to Insights
              </button>
            </>
          ) : null}
        </div>
      </aside>

      {/* ── Insights panel ── */}
      <aside className={`ev-insights-panel ev-glass ${isInsightsOpen ? "ev-open" : ""}`}>
        <div className="ev-lab-head">
          <h3>Saved Insights</h3>
          <button onClick={() => setIsInsightsOpen(false)}>✕</button>
        </div>
        <div className="ev-lab-body">
          {highlights.length === 0 ? (
            <p style={{opacity:0.5,fontSize:"0.9rem"}}>No highlights yet. Select text and save.</p>
          ) : highlights.map(h => (
            <div key={h.id} className="ev-h-pill-full">
              <strong>"{h.text}"</strong>
              {h.comment && <p style={{margin:"6px 0 0",opacity:0.7,fontSize:"0.85rem"}}>{h.comment}</p>}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Highlight comment dialog ── */}
      {isCommentOpen && (
        <div className="ev-overlay">
          <div className="ev-modal ev-glass ev-animate-pop">
            <h3 style={{marginBottom:12,color:"var(--ev-accent)"}}>Create Highlight</h3>
            <blockquote style={{borderLeft:"3px solid var(--ev-accent)",paddingLeft:14,fontStyle:"italic",marginBottom:14,opacity:0.8}}>
              "{newHighText.substring(0,120)}"
            </blockquote>
            <label style={{fontSize:"0.8rem",opacity:0.6,display:"block",marginBottom:6}}>Your note</label>
            <textarea ref={commentRef} placeholder="What's on your mind…?" rows={3}
              style={{width:"100%",borderRadius:10,border:"1px solid var(--ev-border)",background:"transparent",color:"inherit",padding:"10px",resize:"none",fontFamily:"inherit",fontSize:"0.9rem"}} />
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button className="ev-btn-premium" style={{flex:1}} onClick={() => {
                setHighlights(prev=>[...prev,{id:`${Date.now()}`,text:newHighText,comment:commentRef.current?.value||""}]);
                setIsCommentOpen(false); setNewHighText("");
              }}>Save</button>
              <button style={{flex:1,background:"transparent",border:"1px solid var(--ev-border)",borderRadius:10,color:"inherit",cursor:"pointer",padding:"10px"}} onClick={()=>{setIsCommentOpen(false);setNewHighText("");}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main workstation ── */}
      <div className="ev-workstation">

        {/* Hamburger */}
        <button className="ev-hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
          <span/><span/><span/>
        </button>

        {/* Sidebar overlay */}
        {isSidebarOpen && <div className="ev-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`ev-sidebar ev-glass ${isSidebarOpen ? "ev-open" : ""}`}>
          <button className="ev-exit-btn" onClick={() => navigate("/bookExpanded")}>← Back to Reader</button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,padding:"8px 12px",borderRadius:10,background:"rgba(201,162,39,0.08)",border:"1px solid rgba(201,162,39,0.15)"}}>
            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:2,repeat:Infinity}} style={{width:7,height:7,borderRadius:"50%",background:"var(--ev-accent)",boxShadow:"0 0 6px var(--ev-accent)"}} />
            <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.15em",color:"var(--ev-accent)"}}>AI ENHANCED</span>
          </div>
          <div style={{fontSize:"0.75rem",opacity:0.5,marginBottom:20,lineHeight:1.4}}>{chapter.bookTitle}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="ev-nav-item" onClick={() => { setIsInsightsOpen(true); setIsSidebarOpen(false); }}>📌 My Insights ({highlights.length})</button>
            <button className="ev-nav-item" onClick={() => { setIsAiOpen(true); setIsSidebarOpen(false); }}>✨ AI Lab</button>
            <button className="ev-nav-item" onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark?"☀ Light":"☾ Dark"} Mode</button>
          </div>
          {hasTwoSpreads && (
            <div style={{marginTop:"auto",paddingTop:20}}>
              <p style={{fontSize:"0.7rem",opacity:0.5,marginBottom:8}}>PAGES</p>
              {allSpreads.map((_, i) => (
                <div key={i} className={`ev-nav-item ${currentSpread===i?"ev-active":""}`} onClick={() => { setCurrentSpread(i); setDisplaySpread(i); setIsSidebarOpen(false); }}>
                  Spread {i+1} of {allSpreads.length}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main reader */}
        <main className="ev-main-viewport" onMouseUp={handleMouseUp}>
          <div className="ev-scroll-canvas">

            {/* Top bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 10px",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.2em",color:"var(--ev-accent)"}}>✦ AI ENHANCED</span>
                <span style={{fontSize:"0.75rem",opacity:0.5}}>Ch. {chapter.id} — {chapter.title}</span>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button className="ev-btn-premium ev-sm" onClick={() => setIsInsightsOpen(true)}>My Notes ({highlights.length})</button>
                <button className="ev-btn-premium ev-sm" onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark?"☀":"☾"}</button>
              </div>
            </div>

            {/* Context menu */}
            {menuPos && (
              <div ref={menuRef} className="ev-context-menu ev-glass"
                style={{top:menuPos.y, left:menuPos.x, position:"absolute", transform:"translateX(-50%)", zIndex:9999}}
                onClick={e=>e.stopPropagation()}>
                <button className="ev-context-close-btn" onClick={()=>setMenuPos(null)}>×</button>
                <button onClick={()=>{setNewHighText(persistentSel.current);setIsCommentOpen(true);setMenuPos(null);}}>Highlight</button>
                <button className="ev-ai-accent" disabled={isAiLoading} onClick={()=>{handleAskAI(`Explain this in detail: "${persistentSel.current}"`, "explain", persistentSel.current);setMenuPos(null);}}>🔍 Explain</button>
                <button className="ev-ai-accent" disabled={isAiLoading} onClick={()=>{handleAskAI(`Summarize this passage: "${persistentSel.current}"`, "summarize", persistentSel.current);setMenuPos(null);}}>📝 Summarize</button>
                <button className="ev-ai-accent" disabled={isAiLoading} onClick={()=>{handleAskAI(persistentSel.current, "ask", persistentSel.current);setMenuPos(null);}}>✨ Ask AI</button>
              </div>
            )}

            {/* Book spread */}
            <div className="ev-book-container-wrapper">
              <article className="ev-book-container">
                <div className={`ev-book-desk-shadow ${isFlipping?"ev-active":""}`} />
                <div className="ev-book-spine" />

                {/* LEFT PAGE */}
                <section className="ev-book-page ev-left">
                  <PageDecoration type={displaySpread%2===0?"curve":"wave"} position="top"    variant={1} />
                  <PageDecoration type="corner"                             position="bottom"  variant={2} />

                  <div className="ev-page-header">
                    <span className="ev-chapter-tag">Chapter {chapter.id}</span>
                    {displaySpread === 0
                      ? <h1 className="ev-chapter-title">{chapter.title}</h1>
                      : <h1 className="ev-chapter-title" style={{fontSize:"1.2rem",opacity:0.7}}>— continued —</h1>
                    }
                  </div>

                  <div className="ev-reading-text" style={{opacity:isFlipping?0.5:1,transition:"opacity 0.3s",position:"relative",zIndex:1}}>
                    {leftLines.map((item,i)=>renderLine(item,i))}
                  </div>

                  <footer className="ev-page-footer ev-left">
                    <span className="ev-footer-text">{chapter.bookTitle}</span>
                    <span className="ev-page-number">{displaySpread*2+1}</span>
                  </footer>
                </section>

                {/* RIGHT PAGE */}
                <section className={`ev-book-page ev-right ${isFlipping?`ev-is-flipping-${direction}`:""}`}>
                  <div className="ev-page-edge-thickness" />
                  <div className={`ev-page-curl-shadow ${isFlipping?"ev-active":""}`} />
                  <div className={`ev-spine-glow ${isFlipping?"ev-active":""}`} />
                  <PageDecoration type={displaySpread%2===0?"corner":"organic"} position="top"    variant={3} />
                  <PageDecoration type="wave"                                   position="bottom"  variant={4} />

                  <div className="ev-reading-text ev-right-text" style={{opacity:isFlipping?0.5:1,transition:"opacity 0.3s",position:"relative",zIndex:1}}>
                    {rightLines.length > 0
                      ? rightLines.map((item,i)=>renderLine(item,i))
                      : (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60%",gap:16,opacity:0.35}}>
                          <span style={{fontSize:"1.4rem",letterSpacing:"0.6em",color:"var(--ev-accent)"}}>✦ ✦ ✦</span>
                          <p style={{fontSize:"0.7rem",letterSpacing:"0.15em",color:"var(--ev-accent)"}}>
                            {hasTwoSpreads && displaySpread < allSpreads.length-1 ? "Turn page to continue" : "End of Enhanced Content"}
                          </p>
                        </div>
                      )
                    }
                  </div>

                  <footer className="ev-page-footer ev-right">
                    <span className="ev-chapter-number">{displaySpread+1} / {allSpreads.length}</span>
                    <span className="ev-page-number">{displaySpread*2+2}</span>
                  </footer>
                </section>
              </article>
            </div>

            {/* Page navigation */}
            <div style={{display:"flex",justifyContent:"center",gap:16,padding:"12px 0 24px",alignItems:"center"}}>
              <button className="ev-btn-premium ev-sm" disabled={currentSpread===0||isFlipping} onClick={()=>flip("prev")}>‹ Previous</button>
              {hasTwoSpreads && (
                <div style={{display:"flex",gap:8}}>
                  {allSpreads.map((_,i)=>(
                    <button key={i} onClick={()=>{if(!isFlipping){setCurrentSpread(i);setDisplaySpread(i);}}}
                      style={{width:8,height:8,borderRadius:"50%",border:"none",cursor:"pointer",background:currentSpread===i?"var(--ev-accent)":"rgba(201,162,39,0.25)",transform:currentSpread===i?"scale(1.4)":"scale(1)",transition:"all 0.2s"}} />
                  ))}
                </div>
              )}
              <button className="ev-btn-premium ev-sm" disabled={!hasTwoSpreads||currentSpread>=allSpreads.length-1||isFlipping} onClick={()=>flip("next")}>Next ›</button>
            </div>

          </div>{/* scroll-canvas */}
        </main>
      </div>{/* workstation */}

      {/* ── AI Bot ── */}
      <AIBot
        selectedText={selectedText}
        onAction={handleAIBotAction}
        accentColor="#c9a227"
        onAskAI={async (query) => {
          if (!chapter?.unitId) {
            throw new Error("Unit context is missing for this chapter.");
          }
          const selected = (selectedText || persistentSel.current || query).trim();
          const normalized = query.toLowerCase();
          const response =
            normalized.includes("summarize")
              ? await summarizeHighlight({ unitId: chapter.unitId, highlightedText: selected })
              : normalized.includes("explain")
                ? await explainHighlight({ unitId: chapter.unitId, highlightedText: selected })
                : await askHighlight({
                    unitId: chapter.unitId,
                    highlightedText: selected,
                    messages: [{ role: "user", content: query }],
                  });

          return String(
            response?.summary ||
              response?.explanation ||
              response?.answer ||
              response?.response ||
              response?.reply ||
              response?.message ||
              "No response available.",
          );
        }}
      />

      <style>{EV_STYLES}</style>
    </div>
  );
};

// ─── Styles — exact BookContentWindow structure, gold replacing indigo ────────
const EV_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root { --ev-accent:#c9a227; --ev-accent2:#e8c547; --ev-bg:#fcfcfd; --ev-text:#0f172a; --ev-muted:#78716c; --ev-card:rgba(255,255,255,0.8); --ev-border:#f0e8d0; --ev-shadow:0 10px 30px -10px rgba(0,0,0,0.06); --ev-book-bg:#fff; --ev-deco-border:rgba(201,162,39,0.15); }
[data-theme='dark'] { --ev-accent:#c9a227; --ev-accent2:#e8c547; --ev-bg:#0c0a06; --ev-text:#f5f0e8; --ev-muted:#a8956a; --ev-card:rgba(26,18,8,0.7); --ev-border:#2a1f0a; --ev-shadow:0 10px 40px -15px rgba(0,0,0,0.5); --ev-book-bg:#1a1208; --ev-deco-border:rgba(201,162,39,0.2); }

.ev-root { min-height:100vh; background:var(--ev-bg); color:var(--ev-text); font-family:'Inter',-apple-system,sans-serif; transition:all 0.4s cubic-bezier(0.4,0,0.2,1); }
.ev-glass { background:var(--ev-card); backdrop-filter:blur(20px); border:1px solid var(--ev-border); border-radius:28px; }
.ev-workstation { display:flex; height:100vh; padding:20px; gap:20px; box-sizing:border-box; }
.ev-main-viewport { flex:1; display:flex; flex-direction:column; gap:15px; min-width:0; }
.ev-scroll-canvas { flex:1; overflow-y:auto; padding-right:10px; position:relative; }
.ev-scroll-canvas::-webkit-scrollbar { width:4px; }
.ev-scroll-canvas::-webkit-scrollbar-thumb { background:rgba(201,162,39,0.3); border-radius:4px; }

/* Sidebar */
.ev-sidebar { width:280px; padding:30px; display:flex; flex-direction:column; gap:15px; box-sizing:border-box; }
.ev-exit-btn { background:transparent; border:none; color:var(--ev-accent); cursor:pointer; font-weight:800; text-align:left; padding:0; font-size:0.9rem; margin-bottom:6px; }
.ev-nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:12px; cursor:pointer; font-weight:600; font-size:0.85rem; color:var(--ev-muted); background:transparent; border:none; width:100%; text-align:left; transition:all 0.2s; }
.ev-nav-item:hover,.ev-nav-item.ev-active { background:rgba(201,162,39,0.1); color:var(--ev-accent); }

/* Book */
.ev-book-container-wrapper { perspective:3200px; perspective-origin:center; padding:2rem; width:100%; display:flex; justify-content:center; box-sizing:border-box; }
.ev-book-container { display:flex; flex-direction:row; width:100%; max-width:1200px; min-height:85vh; background:var(--ev-book-bg); position:relative; transform-style:preserve-3d; transform:rotateX(2deg); transition:transform 0.6s ease; box-shadow:0 20px 50px -10px rgba(0,0,0,0.3); overflow:hidden; }
.ev-book-container::before,.ev-book-container::after { content:''; position:absolute; top:2px; bottom:2px; width:4px; background:rgba(201,162,39,0.2); border-radius:2px; z-index:0; }
.ev-book-container::before { left:-4px; }
.ev-book-container::after { right:-4px; }
.ev-book-desk-shadow { position:absolute; bottom:-30px; left:5%; width:90%; height:40px; background:rgba(0,0,0,0.18); filter:blur(25px); border-radius:50%; z-index:-1; transition:all 0.6s ease; }
.ev-book-desk-shadow.ev-active { transform:scaleX(1.1) translateY(10px); background:rgba(0,0,0,0.09); }
.ev-book-spine { position:absolute; top:0; bottom:0; left:50%; width:40px; transform:translateX(-50%); background:linear-gradient(to right,rgba(0,0,0,0.15),rgba(201,162,39,0.06) 30%,rgba(0,0,0,0.15)); box-shadow:inset 0 0 10px rgba(0,0,0,0.2); z-index:2; }
.ev-book-page { flex:1; padding:70px 60px; position:relative; backface-visibility:hidden; background-color:var(--ev-book-bg); box-sizing:border-box; }
.ev-book-page.ev-left { z-index:1; border-right:1px solid rgba(0,0,0,0.08); box-shadow:inset -1px 0 0 rgba(0,0,0,0.06); }
.ev-book-page.ev-right { transform-origin:left center; z-index:5; transition:transform 0.6s cubic-bezier(0.645,0.045,0.355,1); }
.ev-is-flipping-next { transform:rotateY(-180deg) !important; }
.ev-is-flipping-prev { animation:evFlipBack 0.6s cubic-bezier(0.645,0.045,0.355,1) forwards; }
@keyframes evFlipBack { 0%{transform:rotateY(-180deg)} 100%{transform:rotateY(0deg)} }
.ev-page-edge-thickness { position:absolute; top:0; right:0; width:3px; height:100%; background:linear-gradient(to right,rgba(0,0,0,0.08),var(--ev-book-bg)); z-index:10; }
.ev-page-curl-shadow { position:absolute; inset:0; opacity:0; pointer-events:none; background:linear-gradient(to right,rgba(0,0,0,0.12) 0%,transparent 20%); transition:opacity 0.3s; z-index:11; }
.ev-page-curl-shadow.ev-active { opacity:1; }
.ev-spine-glow { position:absolute; top:0; left:0; width:40px; height:100%; background:linear-gradient(to right,transparent,rgba(201,162,39,0.2),transparent); opacity:0; filter:blur(8px); z-index:12; }
.ev-spine-glow.ev-active { animation:evSpineSweep 0.6s ease-in-out; }
@keyframes evSpineSweep { 0%{opacity:0;transform:translateX(-10px)} 50%{opacity:1;transform:translateX(15px)} 100%{opacity:0;transform:translateX(0)} }

/* Page content */
.ev-page-header { margin-bottom:30px; position:relative; z-index:1; }
.ev-chapter-tag { font-size:0.7rem; font-weight:700; letter-spacing:2px; color:var(--ev-accent); text-transform:uppercase; }
.ev-chapter-title { font-size:1.8rem; font-weight:800; color:var(--ev-text); margin:10px 0 0; line-height:1.2; letter-spacing:-0.5px; }
.ev-reading-text { font-size:1rem; line-height:1.9; margin-bottom:25px; opacity:0.9; position:relative; z-index:1; }
.ev-right-text { /* continuation on right page */ }
.ev-highlighted-text { background:rgba(201,162,39,0.15); border-bottom:2px solid var(--ev-accent); padding:0 2px; cursor:pointer; border-radius:2px; }
.ev-page-footer { position:absolute; bottom:40px; left:60px; right:60px; display:flex; align-items:center; color:var(--ev-muted); font-size:0.8rem; font-weight:500; }
.ev-page-footer.ev-left { justify-content:space-between; }
.ev-page-footer.ev-right { justify-content:flex-end; }
.ev-chapter-number { font-size:0.8rem; color:var(--ev-muted); }
.ev-page-number { font-size:0.8rem; font-weight:600; color:var(--ev-text); }
.ev-footer-text { font-size:0.75rem; color:var(--ev-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; }

/* AI Lab */
.ev-ai-lab { z-index:100; width:360px; position:fixed; right:-400px; top:20px; bottom:20px; transition:0.6s cubic-bezier(0.4,0,0.2,1); padding:30px; display:flex; flex-direction:column; gap:20px; }
.ev-ai-lab.ev-open { right:20px; }
.ev-insights-panel { z-index:100; width:360px; position:fixed; left:-400px; top:20px; bottom:20px; transition:0.6s cubic-bezier(0.4,0,0.2,1); padding:30px; display:flex; flex-direction:column; gap:20px; }
.ev-insights-panel.ev-open { left:20px; }
.ev-lab-head { display:flex; justify-content:space-between; align-items:center; }
.ev-lab-head h3 { font-size:1rem; font-weight:700; color:var(--ev-accent); }
.ev-lab-head button { background:transparent; border:none; font-size:1.2rem; cursor:pointer; color:var(--ev-muted); }
.ev-lab-body { flex-grow:1; overflow-y:auto; padding-right:10px; }
.ev-query-ref { font-style:italic; opacity:0.6; border-left:3px solid var(--ev-accent); padding-left:15px; margin-bottom:20px; font-size:0.9rem; }
.ev-ai-card { background:rgba(201,162,39,0.06); padding:20px; border-radius:18px; border:1px solid var(--ev-accent); line-height:1.6; font-size:0.9rem; }
.ev-h-pill-full { background:rgba(201,162,39,0.08); padding:12px 15px; border-radius:12px; font-size:0.88rem; margin-bottom:10px; border-left:3px solid var(--ev-accent); line-height:1.5; }

/* Buttons */
.ev-btn-premium { background:var(--ev-accent); color:#1a0f00; border:none; padding:10px 20px; border-radius:12px; font-weight:700; cursor:pointer; box-shadow:0 5px 15px rgba(201,162,39,0.25); transition:all 0.3s ease; }
.ev-btn-premium:hover { transform:translateY(-2px); filter:brightness(1.1); }
.ev-btn-premium:disabled { opacity:0.4; cursor:not-allowed; transform:none; filter:none; }
.ev-btn-premium.ev-sm { font-size:0.8rem; padding:8px 16px; }

/* Context menu */
.ev-context-menu { display:flex; gap:4px; padding:8px; z-index:1000; box-shadow:0 10px 30px rgba(0,0,0,0.2); user-select:none; animation:evCtxPop 0.2s cubic-bezier(0.175,0.885,0.32,1.275); }
.ev-context-close-btn { position:absolute; top:-10px; right:-10px; width:24px; height:24px; border-radius:50%; background:var(--ev-card); border:1px solid var(--ev-border); color:var(--ev-text); font-size:16px; line-height:22px; text-align:center; cursor:pointer; z-index:10; }
.ev-context-close-btn:hover { background:var(--ev-accent); color:#1a0f00; }
.ev-context-menu button { background:transparent; border:none; color:var(--ev-text); padding:8px 14px; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.85rem; white-space:nowrap; }
.ev-context-menu button:hover { background:rgba(201,162,39,0.1); }
.ev-ai-accent { color:var(--ev-accent) !important; }
@keyframes evCtxPop { from{opacity:0;transform:translateX(-50%) translateY(10px) scale(0.9)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }

/* Overlays */
.ev-overlay { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:3001; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); }
.ev-modal { background:var(--ev-card); padding:36px; border-radius:28px; border:1px solid var(--ev-border); box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); max-width:480px; width:90%; position:relative; }
.ev-animate-pop { animation:evPopUp 0.3s cubic-bezier(0.18,0.89,0.32,1.28); }
@keyframes evPopUp { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }

/* Hamburger */
.ev-hamburger-btn { display:none; width:30px; height:20px; background:transparent; border:none; cursor:pointer; padding:0; position:fixed; top:30px; left:30px; z-index:100; flex-direction:column; gap:5px; }
.ev-hamburger-btn span { display:block; width:100%; height:2px; background:var(--ev-accent); border-radius:1px; }
.ev-sidebar-overlay { display:none; }

/* ── Responsive — exact mirror of BookContentWindow ── */
@media (max-width:1024px) {
  .ev-workstation { padding:10px; }
  .ev-sidebar { position:fixed; top:0; left:0; bottom:0; width:280px; transform:translateX(-100%); z-index:3000; transition:transform 0.3s ease-in-out; box-shadow:10px 0 30px rgba(0,0,0,0.15); background:var(--ev-bg); border-radius:0; }
  .ev-sidebar.ev-open { transform:translateX(0); }
  .ev-hamburger-btn { display:flex; }
  .ev-sidebar-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:2999; display:block; }
  .ev-book-container-wrapper { padding:1rem; }
  .ev-book-page { padding:40px 30px; }
  .ev-page-footer { left:30px; right:30px; bottom:25px; }
}
@media (max-width:900px) {
  .ev-book-container { flex-direction:column; min-height:auto; transform:none; }
  .ev-book-page { min-height:400px; }
  .ev-book-page.ev-right { transform-origin:top center; }
  .ev-is-flipping-next { transform:rotateX(-180deg) !important; }
  .ev-book-spine { display:none; }
  .ev-book-container::before,.ev-book-container::after { display:none; }
}
@media (max-width:768px) {
  .ev-book-page { padding:30px 20px; }
  .ev-chapter-title { font-size:1.4rem; }
  .ev-reading-text { font-size:0.95rem; }
  .ev-ai-lab,.ev-insights-panel { width:100%; top:auto; bottom:0; left:0 !important; right:0 !important; border-radius:28px 28px 0 0; max-height:70vh; }
  .ev-ai-lab { right:0 !important; bottom:-100% !important; transition:bottom 0.4s cubic-bezier(0.4,0,0.2,1) !important; }
  .ev-ai-lab.ev-open { bottom:0 !important; right:0 !important; }
  .ev-insights-panel { left:0 !important; bottom:-100% !important; }
  .ev-insights-panel.ev-open { left:0 !important; bottom:0 !important; }
}
@media (max-width:480px) {
  .ev-book-page { padding:20px 15px 50px; }
  .ev-chapter-title { font-size:1.2rem; }
  .ev-page-footer { left:15px; right:15px; }
  .ev-workstation { padding:5px; gap:5px; }
  .ev-book-container-wrapper { padding:0.5rem; }
  .ev-context-menu { flex-direction:column; min-width:150px; }
}
@media (max-width:375px) {
  .ev-book-page { padding:15px 12px 45px; }
  .ev-chapter-title { font-size:1.1rem; }
  .ev-reading-text { font-size:0.9rem; }
}
`;

export default EnhancedView;
