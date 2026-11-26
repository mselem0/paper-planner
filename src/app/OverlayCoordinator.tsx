import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface OverlayState {
  previewPending: boolean
  setPreviewPending: (value: boolean) => void
  previewOpen: boolean
  setPreviewOpen: (value: boolean) => void
  installOpen: boolean
  setInstallOpen: (value: boolean) => void
  moreOpen: boolean
  setMoreOpen: (value: boolean) => void
}
const Context = createContext<OverlayState | null>(null)

export function OverlayCoordinator({ children }: { children: ReactNode }) {
  const [previewPending, setPreviewPending] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const value = useMemo(() => ({ previewPending, setPreviewPending, previewOpen, setPreviewOpen, installOpen, setInstallOpen, moreOpen, setMoreOpen }), [previewPending, previewOpen, installOpen, moreOpen])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useOverlayCoordinator() {
  const value = useContext(Context)
  if (!value) throw new Error('OverlayCoordinator is missing')
  return value
}
