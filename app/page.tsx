export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="w-full py-6 px-6 border-b border-border bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient-hero">
            ShipyardHQ
          </h1>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-white to-white">
        <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gradient-hero mb-6">
          Coming Soon
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
          We’re building something exciting for indie makers and micro-SaaS founders.
          <br />
          Follow us and stay updated for launch.
        </p>
      </section>

      <footer className="w-full py-4 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} <span className="font-semibold text-foreground">ShipyardHQ.dev</span> ·{' '}
        <a
          href="https://x.com/abhi16_93"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-secondary underline transition-colors"
        >
          @abhi16_93
        </a>
      </footer>
    </main>
  )
}
