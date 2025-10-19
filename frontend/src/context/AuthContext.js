import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import api from "../api"

const AuthContext = createContext(null)

const getInitialToken = () => {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem("USER_TOKEN")
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getInitialToken)
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)

  const clearUser = useCallback(() => {
    setUser(null)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("USER_TOKEN")
    } catch {}
    setToken(null)
    clearUser()
  }, [clearUser])

  const fetchUser = useCallback(async () => {
    if (!token) {
      clearUser()
      return
    }
    setLoadingUser(true)
    try {
      const { data } = await api.get("/users/me")
      setUser(data)
    } catch (error) {
      console.error("fetchUser failed", error)
      logout()
    } finally {
      setLoadingUser(false)
    }
  }, [token, clearUser, logout])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event) => {
      if (event.key === "USER_TOKEN") {
        setToken(event.newValue || null)
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(
    (newToken) => {
      if (!newToken) return
      try {
        localStorage.setItem("USER_TOKEN", newToken)
      } catch {}
      setToken(newToken)
    },
    []
  )

  const value = useMemo(
    () => ({
      token,
      user,
      loadingUser,
      isLoggedIn: Boolean(token),
      login,
      logout,
      refreshUser: fetchUser,
    }),
    [token, user, loadingUser, login, logout, fetchUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
