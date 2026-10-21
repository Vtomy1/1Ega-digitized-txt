interface TopBarProps {
  onRunEmulator: () => void;
  onScrollToSection: (sectionId: string) => void;
  activeSection: string;
}

export function TopBar({ onRunEmulator, onScrollToSection, activeSection }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 text-neutral-200">
      {/* Zone 1: Wordmark */}
      <a
        href="#converter"
        onClick={(e) => {
          e.preventDefault();
          onScrollToSection('converter');
        }}
        className="text-lg font-bold tracking-tight text-white flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
      >
        <span className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500 flex items-center justify-center font-mono text-xs text-amber-400 font-bold group-hover:bg-amber-500 group-hover:text-black transition-colors">
          4
        </span>
        <span className="font-['Plus_Jakarta_Sans',sans-serif]">EGA Digitizer</span>
      </a>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-400">
        <button
          onClick={() => onScrollToSection('converter')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'converter' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Converter
        </button>
        <button
          onClick={() => onScrollToSection('emulator')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'emulator' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          QBasic Monitor
        </button>
        <button
          onClick={() => onScrollToSection('palette')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'palette' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          EGA Palette
        </button>
        <button
          onClick={() => onScrollToSection('export')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeSection === 'export' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Code & Savers
        </button>
      </nav>

      {/* Zone 3: Primary CTA */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onRunEmulator}
          className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span className="font-mono">F5</span>
          <span>Run in QBasic</span>
        </button>
      </div>
    </header>
  );
}
