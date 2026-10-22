import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useStore } from '../store/useStore'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Toaster } from './Toaster'

export function AppShell() {
  const theme = useStore((s) => s.theme)
  const { pathname } = useLocation()

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  // Braces matter: newer browsers return a Promise from scrollTo, and an
  // effect must return nothing or a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 rounded-lg font-semibold tracking-tight" aria-label="Evenly home">
            <Logo className="size-7" />
            <span className="text-[17px]">Evenly</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
