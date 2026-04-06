import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { ModuleConfig, Lesson } from "../types";
import { MODULES_BASE_URL } from "../config";
import GuidePanel from "./GuidePanel";
import ModuleCodePanel from "./ModuleCodePanel";
import DiagramPanel from "./DiagramPanel";
import IframePanel from "./IframePanel";
import ImagePanel from "./ImagePanel";
import AnnotateLogo from "./AnnotateLogo";

type MobileTab = "content" | "guide";

export default function ModuleViewer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ModuleConfig | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("content");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    fetch(`${MODULES_BASE_URL}/${moduleId}/module.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Module not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const mod = data as ModuleConfig;
        setConfig(mod);
        if (mod.lessons.length > 0) setActiveId(mod.lessons[0].id);
      })
      .catch((err) => setError(err.message));
  }, [moduleId]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-8 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-red-400 text-lg mb-2">Could not load module</p>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            ← Back to modules
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Loading module...
      </div>
    );
  }

  const activeLesson: Lesson | undefined = config.lessons.find((l) => l.id === activeId);
  const isFullWidth = activeLesson?.view === "markdown";

  const handleSelectLesson = (id: string) => {
    setActiveId(id);
    setMobileTab("content");
    setSidebarOpen(false);
  };

  const renderContentPanel = () => {
    if (!activeLesson) return null;

    switch (activeLesson.view) {
      case "code":
        return activeLesson.file ? (
          <ModuleCodePanel
            moduleId={moduleId!}
            file={activeLesson.file}
            addedLines={activeLesson.addedLines}
            removedLines={activeLesson.removedLines}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No file specified for this lesson
          </div>
        );
      case "diagram":
        return <DiagramPanel diagrams={activeLesson.diagrams || []} />;
      case "iframe":
      case "swagger":
        return activeLesson.url ? (
          <IframePanel url={activeLesson.url} title={activeLesson.title} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No URL specified for this lesson
          </div>
        );
      case "image":
        return activeLesson.url ? (
          <ImagePanel url={activeLesson.url} alt={activeLesson.title} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No image URL specified
          </div>
        );
      case "markdown":
        return null;
      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 mb-3 transition-colors"
        >
          <AnnotateLogo size={18} />
          <span className="font-medium">Annotate</span>
        </button>
        <h1 className="text-sm font-bold text-gray-100">{config.title}</h1>
        {config.subtitle && <p className="text-xs text-gray-500 mt-1">{config.subtitle}</p>}
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Lessons">
        {config.lessons.map((lesson, i) => (
          <button
            key={lesson.id}
            onClick={() => handleSelectLesson(lesson.id)}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
              activeId === lesson.id
                ? "bg-blue-600/20 text-blue-400 border-r-2 border-blue-500"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
            aria-current={activeId === lesson.id ? "page" : undefined}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
              activeId === lesson.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500"
            }`}>
              {i + 1}
            </span>
            <span className="truncate">{lesson.title}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-400 hover:text-gray-200"
          aria-label="Open navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-200 truncate">
          {activeLesson?.title || config.title}
        </h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:block w-64 shrink-0 h-full">{sidebarContent}</aside>

        {sidebarOpen && (
          <>
            <div className="sidebar-overlay md:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-xl">
              {sidebarContent}
            </aside>
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {!isFullWidth && (
            <div className="md:hidden flex border-b border-gray-800 bg-gray-900">
              <button
                onClick={() => setMobileTab("content")}
                className={`flex-1 py-2.5 text-sm text-center ${
                  mobileTab === "content" ? "tab-active" : "tab-inactive"
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setMobileTab("guide")}
                className={`flex-1 py-2.5 text-sm text-center ${
                  mobileTab === "guide" ? "tab-active" : "tab-inactive"
                }`}
              >
                Guide
              </button>
            </div>
          )}

          <div className="hidden md:flex flex-1 overflow-hidden">
            {isFullWidth && activeLesson ? (
              <div className="flex-1 overflow-hidden bg-gray-950">
                <GuidePanel markdown={activeLesson.guide} fullWidth />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-hidden bg-gray-950">
                  {renderContentPanel()}
                </div>
                {activeLesson && (
                  <div className="w-[420px] shrink-0 overflow-hidden bg-gray-900 border-l border-gray-800">
                    <GuidePanel markdown={activeLesson.guide} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="md:hidden flex-1 overflow-hidden">
            {isFullWidth && activeLesson ? (
              <GuidePanel markdown={activeLesson.guide} fullWidth />
            ) : mobileTab === "content" ? (
              <div className="h-full overflow-hidden bg-gray-950">
                {renderContentPanel()}
              </div>
            ) : (
              activeLesson && (
                <div className="h-full overflow-hidden bg-gray-900">
                  <GuidePanel markdown={activeLesson.guide} />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
