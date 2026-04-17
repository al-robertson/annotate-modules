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
            \u2190 Back to modules
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

  // ... sidebar and layout rendering continues
  // See the full file for the complete three-panel layout implementation
}
