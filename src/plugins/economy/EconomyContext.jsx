import React, { createContext, useContext } from 'react'
import { useEconomy } from './hooks/useEconomy'

const EconomyContext = createContext(null)

export function EconomyProvider({ children }) {
  const economy = useEconomy()
  return (
    <EconomyContext.Provider value={economy}>
      {children}
    </EconomyContext.Provider>
  )
}

export function useEconomyContext() {
  const ctx = useContext(EconomyContext)
  if (!ctx) {
    throw new Error('useEconomyContext must be used within an EconomyProvider')
  }
  return ctx
}

