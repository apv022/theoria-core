import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { AboutPage } from "./pages/AboutPage";
import { PwaStatus } from "./components/PwaStatus";

const CoursePage = lazy(() => import("./pages/CoursePage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const CompilePage = lazy(() => import("./pages/CompilePage"));
const MyCoursesPage = lazy(() => import("./pages/MyCoursesPage"));

const navigation = [
  ["/", "Home"],
  ["/discover", "Discover"],
  ["/create", "Create"],
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
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/">
          <span>Θ</span> Theoria
        </Link>
        <nav aria-label="Primary navigation">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeButton />
      </header>
      <main id="main">
        <Suspense fallback={<div className="status-card">Opening your workspace…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/courses/:id" element={<CoursePage />} />
            <Route path="/courses/:id/learn" element={<ReaderPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/compile" element={<CompilePage />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
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
        <span>Your work stays in this browser.</span>
      </footer>
      <PwaStatus />
    </div>
  );
}
