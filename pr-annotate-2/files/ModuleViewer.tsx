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

  // ... rest of component renders sidebar, content panel, guide panel
  // The key change is in renderContentPanel where ModuleCodePanel
  // now receives addedLines and removedLines props:
  //
  // <ModuleCodePanel
  //   moduleId={moduleId!}
  //   file={activeLesson.file}
  //   addedLines={activeLesson.addedLines}
  //   removedLines={activeLesson.removedLines}
  // />
}
