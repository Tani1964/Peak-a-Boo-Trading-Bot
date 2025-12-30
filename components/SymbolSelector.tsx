"use client";
import { useState, useEffect } from "react";




export default function SymbolSelector({ value, onChange }: { value: string; onChange: (symbol: string) => void }) {
  const [input, setInput] = useState(value);

  // Keep input in sync with parent value
  useEffect(() => {
    setInput(value);
  }, [value]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const symbol = input.trim().toUpperCase();
      onChange(symbol);
      setInput(symbol); // update input to match searched symbol
    }
    return false;
  };

  return (
    <form className="mb-6 flex items-center gap-3" onSubmit={handleSearch}>
      <input
        id="symbol-search"
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type any symbol (e.g. TSLA)"
        className="px-4 py-2 border rounded-lg text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm w-48"
        autoComplete="off"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow"
      >
        Search
      </button>
    </form>
  );
}
