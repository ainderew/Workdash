import { useState, useEffect, useCallback } from 'react';
import type { HLJSApi } from 'highlight.js';

let hljsInstance: HLJSApi | null = null;
let loadPromise: Promise<HLJSApi> | null = null;

async function loadHighlightJs(): Promise<HLJSApi> {
  if (hljsInstance) return hljsInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const hljs = (await import('highlight.js/lib/core')).default;

    const [
      javascript,
      typescript,
      python,
      css,
      xml,
      json,
      bash,
      sql,
      go,
      rust,
      java,
      csharp,
    ] = await Promise.all([
      import('highlight.js/lib/languages/javascript'),
      import('highlight.js/lib/languages/typescript'),
      import('highlight.js/lib/languages/python'),
      import('highlight.js/lib/languages/css'),
      import('highlight.js/lib/languages/xml'),
      import('highlight.js/lib/languages/json'),
      import('highlight.js/lib/languages/bash'),
      import('highlight.js/lib/languages/sql'),
      import('highlight.js/lib/languages/go'),
      import('highlight.js/lib/languages/rust'),
      import('highlight.js/lib/languages/java'),
      import('highlight.js/lib/languages/csharp'),
    ]);

    hljs.registerLanguage('javascript', javascript.default);
    hljs.registerLanguage('js', javascript.default);
    hljs.registerLanguage('typescript', typescript.default);
    hljs.registerLanguage('ts', typescript.default);
    hljs.registerLanguage('python', python.default);
    hljs.registerLanguage('py', python.default);
    hljs.registerLanguage('css', css.default);
    hljs.registerLanguage('html', xml.default);
    hljs.registerLanguage('xml', xml.default);
    hljs.registerLanguage('json', json.default);
    hljs.registerLanguage('bash', bash.default);
    hljs.registerLanguage('sh', bash.default);
    hljs.registerLanguage('shell', bash.default);
    hljs.registerLanguage('sql', sql.default);
    hljs.registerLanguage('go', go.default);
    hljs.registerLanguage('rust', rust.default);
    hljs.registerLanguage('java', java.default);
    hljs.registerLanguage('csharp', csharp.default);
    hljs.registerLanguage('cs', csharp.default);

    hljsInstance = hljs;
    return hljs;
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

interface UseHighlighterResult {
  highlight: (code: string, language: string) => string;
  isLoading: boolean;
}

export function useHighlighter(): UseHighlighterResult {
  const [hljs, setHljs] = useState<HLJSApi | null>(hljsInstance);

  useEffect(() => {
    if (hljsInstance) {
      setHljs(hljsInstance);
      return;
    }

    let cancelled = false;
    void loadHighlightJs()
      .then((instance) => {
        if (!cancelled) {
          setHljs(instance);
        }
      })
      .catch(() => {
        // Import failed — loadPromise has been reset so next mount will retry
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const highlight = useCallback((code: string, language: string): string => {
    if (!hljs) return escapeHtml(code);

    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      // Auto-detect if no language specified
      if (!language) {
        return hljs.highlightAuto(code).value;
      }
    } catch {
      // Fall through to plain text
    }

    return escapeHtml(code);
  }, [hljs]);

  return { highlight, isLoading: !hljs };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
