export function Footer() {
    return (
    <footer className="bg-card border-t mt-16">
        <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-foreground/80">
            <p>🏆 Oscar Betting App • 2024</p>
            <p className="mt-1">Aposte com seus amigos nos vencedores do Oscar</p>
            <p className="mt-1">
              Este produto utiliza a API do TMDB, mas não é endossado pelo TMDB.
            </p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <a className="text-indigo-600 hover:underline" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
                TMDB
              </a>
              <a className="text-indigo-600 hover:underline" href="#" aria-disabled="true">
                Privacidade (em breve)
              </a>
              <a className="text-indigo-600 hover:underline" href="#" aria-disabled="true">
                Suporte (em breve)
              </a>
            </div>
          </div>
        </div>
      </footer>
    )
  }