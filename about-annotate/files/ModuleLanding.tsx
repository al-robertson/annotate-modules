import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ModulesIndex } from "../types";
import { MODULES_BASE_URL } from "../config";
import AnnotateLogo from "./AnnotateLogo";

export default function ModuleLanding() {
  const [index, setIndex] = useState<ModulesIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${MODULES_BASE_URL}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load modules index (${r.status})`);
        return r.json();
      })
      .then((data) => setIndex(data as ModulesIndex))
      .catch((err) => setError(err.message));
  }, []);

  // ... error and loading states ...

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <AnnotateLogo size={36} />
            <h1 className="text-3xl font-bold tracking-tight">Annotate</h1>
          </div>
          <p className="text-gray-400 text-sm">Code documentation and guided walkthroughs</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {index.modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => navigate(`/module/${mod.id}`)}
              className="text-left p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-500/50 transition-all group"
            >
              {/* Module card with title, subtitle, description */}
            </button>
          ))}
        </div>

        <div className="mt-12 flex justify-center gap-4">
          <a href="#/studio" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded ...">
            Studio
          </a>
        </div>
      </div>
    </div>
  );
}
