import { useState, type ReactNode } from 'react';
import { LuInfo } from 'react-icons/lu';

/**
 * Onboarding contextual: um "Por que isso importa?" discreto que expande uma
 * explicação curta ao lado de um campo/config. Tap-friendly (sem tooltip hover),
 * pensado para mobile. Use textos curtos e úteis.
 */
export function FieldHint({ children, label = 'Por que isso importa?' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        <LuInfo size={13} /> {label}
      </button>
      {open && (
        <p className="mt-1.5 rounded-medium bg-content2/60 px-2.5 py-2 text-xs leading-relaxed text-text-muted">
          {children}
        </p>
      )}
    </div>
  );
}
