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

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-8 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-red-400 text-lg mb-2">Could not load modules</p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    );
  }

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
              className="text-left p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-500/50 hover:bg-gray-900/80 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-100 group-hover:text-blue-400 transition-colors mb-1">
                    {mod.title}
                  </h2>
                  {mod.subtitle && (
                    <p className="text-sm text-gray-400 mb-3">{mod.subtitle}</p>
                  )}
                  {mod.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{mod.description}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 flex justify-center gap-4">
          <a
            href="#/studio"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded border border-emerald-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Studio
          </a>
        </div>
      </div>
    </div>
  );
}
