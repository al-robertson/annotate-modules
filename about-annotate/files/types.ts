export interface Download {
  label: string;
  filename: string;
}

export interface Diagram {
  title: string;
  chart: string;
}

export type ViewType = "code" | "swagger" | "diagram" | "iframe" | "markdown" | "image";

export interface Lesson {
  id: string;
  title: string;
  view: ViewType;
  guide: string;
  file?: string;
  code?: string;
  language?: string;
  url?: string;
  diagrams?: Diagram[];
  /** Line numbers that were added/modified (highlighted green in code view) */
  addedLines?: number[];
  /** Line numbers that were removed (highlighted red in code view) */
  removedLines?: number[];
}

export interface LessonConfig {
  title: string;
  subtitle?: string;
  downloads?: Download[];
  enableWizard?: boolean;
  lessons: Lesson[];
}

export interface AppConfig {
  sourceBaseUrl: string;
  downloadsBaseUrl: string;
  swaggerUrl: string;
}

export interface ModuleMeta {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
}

export interface ModuleConfig {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  lessons: Lesson[];
}

export interface ModulesIndex {
  modules: ModuleMeta[];
}
