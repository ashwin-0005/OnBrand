import { ShieldMark } from "./Logo";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-ink/5 bg-white text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 font-serif font-bold">
          <ShieldMark className="h-5 w-5" /> OnBrand
        </p>
      </div>
    </footer>
  );
}
