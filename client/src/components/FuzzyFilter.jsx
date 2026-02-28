import { useState, useEffect, useRef, useMemo } from 'react';

export function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * FuzzyFilter — a text input with autocomplete dropdown that filters as you type.
 *
 * Props:
 *   options     - Array of { value: string, label: string }
 *   value       - Currently selected value (string)
 *   onChange     - Called with the new value string on every keystroke / selection
 *   placeholder - Input placeholder text (default: "Filter...")
 *   className   - Additional class names for the wrapper div
 *   liveFilter  - If true, onChange fires on every keystroke (for client-side filtering)
 */
export default function FuzzyFilter({ options, value, onChange, placeholder = 'Filter...', className = '', liveFilter = false }) {
  // Resolve the display label for the current value
  const labelFor = (v) => {
    if (!v) return '';
    const opt = options.find((o) => o.value === v);
    return opt ? opt.label : v;
  };

  const [query, setQuery] = useState(labelFor(value));
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Sync displayed text when value changes externally
  useEffect(() => { setQuery(labelFor(value)); }, [value, options]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setFocused(false);
        // In non-liveFilter mode, revert text to current value when clicking away
        if (!liveFilter) setQuery(labelFor(value));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, options, liveFilter]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) => fuzzyMatch(o.label, query));
  }, [options, query]);

  const handleInput = (text) => {
    setQuery(text);
    if (liveFilter) {
      // Client-side mode: fire onChange on every keystroke
      const exact = options.find((o) => o.label.toLowerCase() === text.toLowerCase());
      onChange(exact ? exact.value : text);
    } else {
      // Server-side mode: only fire for exact matches or clear
      if (!text) {
        onChange('');
      } else {
        const exact = options.find((o) => o.label.toLowerCase() === text.toLowerCase());
        if (exact) onChange(exact.value);
      }
    }
  };

  const handleSelect = (opt) => {
    setQuery(opt.label);
    onChange(opt.value);
    setFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    inputRef.current?.focus();
  };

  const showDropdown = focused && (suggestions.length > 0 || query.trim());

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-20 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1">
          {suggestions.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(o)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${value === o.value ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
              >
                {o.label}
              </button>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
