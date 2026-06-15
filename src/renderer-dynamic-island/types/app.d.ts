declare global {
  interface Window {
    ELECTRON_DISABLE_SECURITY_WARNINGS?: string
    os: 'windows' | 'linux' | 'mac'
    setLang?: (lang?: string) => void
  }

  namespace LX {

  }
}
