import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import CategoryPage from "./pages/CategoryPage"
import MapPage from "./pages/MapPage"
import StadiumPage from "./pages/StadiumPage"
import NotFound from "./pages/NotFound"
import "./App.css"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminHome from "./pages/admin/AdminHome"
import AdminTeams from "./pages/admin/AdminTeams"
import AdminMatches from "./pages/admin/AdminMatches"
import AdminParkingAreas from "./pages/admin/AdminParkingAreas"
import UserLogin from "./pages/auth/UserLogin"
import UserRegister from "./pages/auth/UserRegister"
import AppLayout from "./components/AppLayout"
import ProfilePage from "./pages/ProfilePage"
import { AuthProvider } from "./context/AuthContext"
import { useKakaoLoader } from "react-kakao-maps-sdk"

export default function App() {
  const kakaoAppKey = (process.env.REACT_APP_KAKAO_APP_KEY || "").trim()

  const [loading, error] = useKakaoLoader({
    appkey: kakaoAppKey,
    libraries: ["drawing", "services", "clusterer"],
  })

  if (!kakaoAppKey) {
    return (
      <div style={{ padding: 16 }}>
        Kakao Map 키가 설정되지 않았습니다. 환경 변수를 확인해 주세요.
      </div>
    )
  }

  if (loading) return <div style={{ padding: 16 }}>Loading map...</div>
  if (error)
    return (
      <div style={{ padding: 16 }}>
        Failed to load map. Please refresh or verify your Kakao Platform domain settings.
      </div>
    )

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="category/:categoryId" element={<CategoryPage />} />
            <Route path="stadium/:id" element={<StadiumPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="login" element={<UserLogin />} />
            <Route path="register" element={<UserRegister />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="404" element={<NotFound />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/matches" element={<AdminMatches />} />
          <Route path="/admin/parking-areas" element={<AdminParkingAreas />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
