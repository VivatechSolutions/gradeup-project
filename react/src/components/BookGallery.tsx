import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { getLibrarySubjects, type LibrarySubject } from "../lib/gradeupApi";
import { buildApiUrl } from "../lib/apiBase";
import { useToast } from "../hooks/use-toast";

// --- Types ---
interface Book {
  id: string;
  title: string;
  subject: string;
  color: string;
  icon: string;
  coverImageUrl?: string | null;
  imageCandidates?: string[];
}

const FALLBACK_BOOKS: Book[] = [
  // --- SCIENCE (Biology & Chemistry) ---
  {
    id: "sci-101",
    title: "Cellular Biology",
    subject: "Science",
    icon: "🧬",
    color: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  },
  {
    id: "sci-102",
    title: "Human Anatomy",
    subject: "Science",
    icon: "🫁",
    color: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
  },
  {
    id: "sci-103",
    title: "Organic Chemistry",
    subject: "Science",
    icon: "🧪",
    color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  {
    id: "sci-104",
    title: "Genetics & Heredity",
    subject: "Science",
    icon: "🧬",
    color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  },

  // --- PHYSICS ---
  {
    id: "phy-201",
    title: "Quantum Mechanics",
    subject: "Physics",
    icon: "⚛️",
    color: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
  },
  {
    id: "phy-202",
    title: "Thermodynamics",
    subject: "Physics",
    icon: "🔥",
    color: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  },
  {
    id: "phy-203",
    title: "Electromagnetism",
    subject: "Physics",
    icon: "⚡",
    color: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
  },
  {
    id: "phy-204",
    title: "Astrophysics",
    subject: "Physics",
    icon: "🚀",
    color: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
  },

  // --- MATHEMATICS ---
  {
    id: "mat-301",
    title: "Advanced Calculus",
    subject: "Mathematics",
    icon: "♾️",
    color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
  {
    id: "mat-302",
    title: "Linear Algebra",
    subject: "Mathematics",
    icon: "📊",
    color: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  },
  {
    id: "mat-303",
    title: "Statistics & Prob",
    subject: "Mathematics",
    icon: "🎲",
    color: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
  },
  {
    id: "mat-304",
    title: "Differential Eq",
    subject: "Mathematics",
    icon: "📉",
    color: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
  },

  // --- HISTORY ---
  {
    id: "his-401",
    title: "Ancient Civilizations",
    subject: "History",
    icon: "🏺",
    color: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  },
  {
    id: "his-402",
    title: "The Renaissance",
    subject: "History",
    icon: "🎨",
    color: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
  },
  {
    id: "his-403",
    title: "World War II",
    subject: "History",
    icon: "🪖",
    color: "linear-gradient(135deg, #475569 0%, #1e293b 100%)",
  },
  {
    id: "his-404",
    title: "The Space Race",
    subject: "History",
    icon: "👨‍🚀",
    color: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
  },
];

const BookGallery: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const booksPerPage = 4;
  const subjects = ["All", ...Array.from(new Set(books.map((book) => book.subject)))];

  const filteredBooks = books.filter((book) => {
    const matchesSubject = activeSubject === "All" || book.subject === activeSubject;
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const currentBooks = filteredBooks.slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage);

  // Close reader on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedBook(null); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBooks() {
      try {
        const data = await getLibrarySubjects();
        if (ignore) return;

        const mappedBooks = data.map((item: LibrarySubject, index: number) => {
          const palette = [
            "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
            "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
          ];
          const icons: Record<string, string> = {
            calculator: "🧮",
            zap: "⚡",
            flask: "🧪",
            dna: "🌿",
            scroll: "📜",
            "book-open": "📘",
          };

          return {
            id: item.subjectGroupKey,
            title: item.title,
            subject: item.subject,
            icon: icons[item.visual?.iconKey || "book-open"] || "📘",
            color: palette[index % palette.length],
            coverImageUrl: item.coverImageUrl || null,
            imageCandidates: item.imageCandidates || [],
          };
        });

        setBooks(mappedBooks);
      } catch (error) {
        if (!ignore) {
          setBooks([]);
          toast({
            title: "Library unavailable",
            description: error instanceof Error ? error.message : "Failed to load books.",
            variant: "destructive",
          });
        }
      } finally {
        if (!ignore) setBooksLoading(false);
      }
    }

    loadBooks();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="gallery-root" data-theme={isDark ? "dark" : "light"}>
      <header className="gallery-header">
        <div className="header-top">
          <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
        <div className="brand">
          <h1>Book<span>Content</span></h1>
          <p>Explore your academic subjects</p>
        </div>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search textbooks..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <nav className="filter-nav">
          {subjects.map((sub) => (
            <button
              key={sub}
              className={`filter-chip ${activeSubject === sub ? "active" : ""}`}
              onClick={() => { setActiveSubject(sub); setCurrentPage(1); }}
            >
              {sub}
            </button>
          ))}
        </nav>
      </header>

      <main className="book-grid">
        {!booksLoading && currentBooks.length === 0 && (
          <div className="empty-block">
            <div className="empty-emoji">📚</div>
            <h3>No data available</h3>
            <p>No books are available for the selected filters yet.</p>
          </div>
        )}
        {currentBooks.map((book, index) => (
          <div
            key={book.id}
            className="book-container"
            style={{ "--idx": index } as React.CSSProperties}
            onClick={() => setLocation(`/bookExpanded?book=${encodeURIComponent(book.id)}`)}
          >
            <div className="book-3d-card">
              <div className="book-pages"></div>
              <div className="book-cover" style={{ background: book.color }}>
                {!brokenImages[book.id] && (book.coverImageUrl || book.imageCandidates?.length) ? (
                  <img
                    src={buildApiUrl(book.coverImageUrl || book.imageCandidates?.[0] || "")}
                    alt={book.title}
                    className="book-cover-image"
                    onError={() => setBrokenImages((current) => ({ ...current, [book.id]: true }))}
                  />
                ) : null}
                <div className="spine-fold"></div>
                <div className="cover-content">
                  <span className="book-icon">{book.icon}</span>
                  <h3>{book.title}</h3>
                </div>
              </div>
            </div>
            <div className="book-footer">
              <span className="subject-tag">{book.subject}</span>
            </div>
          </div>
        ))}
      </main>

      {/* --- PREMIUM READER OVERLAY --- */}
      {selectedBook && (
        <div className="reader-overlay">
          <div className="reader-container">
            <button className="close-reader" onClick={() => setSelectedBook(null)}>
              <X size={24} />
            </button>
            
            <aside className="reader-sidebar">
              <div className="sidebar-header">
                <span className="mini-icon">{selectedBook.icon}</span>
                <h4>Chapters</h4>
              </div>
              <ul className="chapter-list">
                <li className="active">01. Introduction to {selectedBook.title}</li>
                <li>02. Core Principles</li>
                <li>03. Advanced Methodologies</li>
                <li>04. Case Studies</li>
                <li>05. Final Summary</li>
              </ul>
            </aside>

            <section className="reader-content">
              <nav className="content-nav">
                <span className="breadcrumb">{selectedBook.subject} / {selectedBook.title}</span>
                <div className="nav-btns">
                  <button><ChevronLeft size={20} /></button>
                  <span>Page 1 of 42</span>
                  <button><ChevronRight size={20} /></button>
                </div>
              </nav>
              <article className="reading-area">
                <h1>{selectedBook.title}</h1>
                <p className="lead-text">Welcome to the comprehensive guide on {selectedBook.title.toLowerCase()}.</p>
                <div className="placeholder-text">
                  <p>In this section, we explore the fundamental concepts that define the field. Every chapter is meticulously crafted to ensure academic excellence and deep understanding.</p>
                  <div className="content-graphic" style={{ background: selectedBook.color }}>
                    {selectedBook.icon}
                  </div>
                  <p>Through systematic analysis and peer-reviewed research, this textbook provides the essential framework required for modern mastery of {selectedBook.subject}.</p>
                </div>
              </article>
            </section>
          </div>
        </div>
      )}

      <footer className="pagination-controls">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</button>
        <span className="page-num">Page {currentPage} of {totalPages || 1}</span>
        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
      </footer>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  :root {
    --bg: #f8fafc;
    --text: #0f172a;
    --card: #ffffff;
    --border: #e2e8f0;
    --accent: #6366f1;
  }

  [data-theme='dark'] {
    --bg: #0f172a;
    --text: #f8fafc;
    --card: #1e293b;
    --border: #334155;
    --accent: #818cf8;
  }

  .gallery-root {
    background: var(--bg);
    color: var(--text);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 100vh;
    padding: 40px;
  }

  /* Header & Navigation */
  .gallery-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 60px; }
  .header-top { display: flex; justify-content: space-between; width: 100%; margin-bottom: 40px; }
  .brand h1 { font-size: 3rem; font-weight: 900; margin: 0; }
  .brand span { opacity: 0.4; font-weight: 300; }
  
  .search-bar { 
    width: 100%; max-width: 600px; background: var(--card); 
    border: 1px solid var(--border); padding: 15px 25px; 
    border-radius: 20px; margin: 30px 0;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  }
  .search-bar input { background: transparent; border: none; outline: none; width: 100%; color: var(--text); font-size: 1.1rem; }

  .filter-nav { display: flex; gap: 12px; margin-bottom: 20px; }
  .filter-chip { 
    padding: 10px 24px; border-radius: 99px; background: var(--card); 
    border: 1px solid var(--border); color: var(--text); cursor: pointer;
    font-weight: 600; transition: 0.3s;
  }
  .filter-chip.active { background: var(--accent); color: white; border-color: var(--accent); }

  /* Grid */
  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 40px;
    perspective: 1500px;
  }

  .book-container { cursor: pointer; position: relative; }

  /* 3D Card Animation */
  .book-3d-card {
    position: relative; height: 400px; transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .book-container:hover .book-3d-card { transform: rotateY(-25deg) translateY(-10px); }

  .book-cover {
    position: absolute; inset: 0; border-radius: 8px 16px 16px 8px;
    z-index: 2; padding: 30px; color: white;
    display: flex; flex-direction: column; justify-content: flex-end;
    box-shadow: 10px 10px 20px rgba(0,0,0,0.2);
    overflow: hidden;
  }

  .book-cover-image {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    z-index: 0;
  }

  .book-pages {
    position: absolute; width: 96%; height: 96%; right: 0; top: 2%;
    background: #fff; border-radius: 4px 12px 12px 4px;
    box-shadow: inset 5px 0 10px rgba(0,0,0,0.1);
    z-index: 1;
  }

  .cover-content {
    position: relative;
    z-index: 2;
  }

  /* READER OVERLAY (Premium Design) */
  .reader-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.4s ease;
  }

  .reader-container {
    width: 95%; height: 90vh; background: var(--bg);
    border-radius: 24px; display: grid; grid-template-columns: 300px 1fr;
    overflow: hidden; position: relative;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .close-reader {
    position: absolute; top: 20px; right: 20px; z-index: 10;
    background: var(--card); border: 1px solid var(--border);
    color: var(--text); border-radius: 50%; width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }

  .reader-sidebar {
    background: var(--card); border-right: 1px solid var(--border);
    padding: 40px 20px;
  }

  .sidebar-header { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
  .mini-icon { font-size: 2rem; }
  .chapter-list { list-style: none; padding: 0; }
  .chapter-list li { 
    padding: 12px 16px; border-radius: 12px; margin-bottom: 8px;
    cursor: pointer; font-weight: 500; color: var(--text); opacity: 0.7;
    transition: 0.2s;
  }
  .chapter-list li.active { background: var(--accent); color: white; opacity: 1; }
  .chapter-list li:hover:not(.active) { background: var(--border); opacity: 1; }

  .reader-content { 
    padding: 60px; overflow-y: auto; display: flex; flex-direction: column;
  }

  .content-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
  }

  .reading-area { max-width: 800px; margin: 0 auto; line-height: 1.8; }
  .reading-area h1 { font-size: 3rem; margin-bottom: 20px; }
  .lead-text { font-size: 1.4rem; font-weight: 500; opacity: 0.8; margin-bottom: 30px; }
  
  .content-graphic {
    height: 200px; width: 100%; border-radius: 20px; margin: 40px 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 5rem; color: white;
  }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  
  @media (max-width: 900px) {
    .reader-container { grid-template-columns: 1fr; }
    .reader-sidebar { display: none; }
  }
`;

export default BookGallery;
