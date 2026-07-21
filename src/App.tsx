import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { AboutPage } from "./pages/AboutPage";
import { PwaStatus } from "./components/PwaStatus";
import { ScrollManager } from "./components/ScrollManager";

const CoursePage = lazy(() => import("./pages/CoursePage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const CompilePage = lazy(() => import("./pages/CompilePage"));
const MyCoursesPage = lazy(() => import("./pages/MyCoursesPage"));
const MyLearningPage = lazy(() => import("./pages/MyLearningPage"));

const navigation = [
  ["/", "Home"],
  ["/discover", "Discover"],
  ["/my-learning", "My Learning"],
  ["/create", "Create"],
  ["/compile", "Compile"],
  ["/my-courses", "My Courses"],
  ["/about", "About"],
] as const;

function ThemeButton() {
  const [dark, setDark] = useState(() => localStorage.getItem("theoria-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theoria-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button
      className="icon-button"
      aria-label={`Use ${dark ? "light" : "dark"} theme`}
      onClick={() => setDark(!dark)}
    >
      {dark ? "☀" : "◐"}
    </button>
  );
}

export function App() {
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  useEffect(() => {
    const blocked = () => setStorageBlocked(true);
    window.addEventListener("theoria-storage-blocked", blocked);
    return () => window.removeEventListener("theoria-storage-blocked", blocked);
  }, []);
  return (
    <div className="app-shell">
      <ScrollManager />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/">
          <span>Θ</span> Theoria
        </Link>
        <button
          ref={menuButtonRef}
          className="menu-button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <nav
          id="primary-navigation"
          className={menuOpen ? "open" : ""}
          aria-label="Primary navigation"
        >
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeButton />
      </header>
      <main id="main">
        {storageBlocked ? (
          <div className="notice" role="alert">
            A newer storage version is waiting. Close other Theoria tabs, then reload this page.
          </div>
        ) : null}
        <Suspense fallback={<div className="status-card">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/courses/:id" element={<CoursePage />} />
            <Route path="/courses/:id/learn" element={<ReaderPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/compile" element={<CompilePage />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
            <Route path="/my-learning" element={<MyLearningPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link className="button" to="/">
                    Return home
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <span>Built on the open MCF 1.0 format.</span>
        <span>Explore, create, and export portable courses.</span>
      </footer>
      <PwaStatus />
    </div>
  );
}
