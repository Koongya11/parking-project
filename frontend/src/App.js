import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import CategoryPage from "./pages/CategoryPage"
import MapPage from "./pages/MapPage"
import StadiumPage from "./pages/StadiumPage"
import NotFound from "./pages/NotFound"
import ReturnFeedback from "./components/ReturnFeedback"
import "./App.css"
import AdminLogin from "./pages/admin/AdminLogin"
import AdminHome from "./pages/admin/AdminHome"
import AdminTeams from "./pages/admin/AdminTeams"
import AdminMatches from "./pages/admin/AdminMatches"
import AdminParkingAreas from "./pages/admin/AdminParkingAreas"
import UserLogin from "./pages/auth/UserLogin"
import UserRegister from "./pages/auth/UserRegister"
import { useKakaoLoader } from "react-kakao-maps-sdk"

export default function App() {
  const [loading, error] = useKakaoLoader({
    appkey: "3cba1aa3732aedaf48e84e961c8403d8",
    libraries: ["drawing", "services", "clusterer"],
  })
  if (loading) return <div style={{ padding: 16 }}>지도를 불러오는 중...</div>
  if (error) return <div style={{ padding: 16 }}>지도를 로딩하는 중 오류가 발생했습니다.</div>
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/stadium/:id" element={<StadiumPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/register" element={<UserRegister />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/teams" element={<AdminTeams />} />
        <Route path="/admin/matches" element={<AdminMatches />} />
        <Route path="/admin/parking-areas" element={<AdminParkingAreas />} />
      </Routes>
      <ReturnFeedback />
    </BrowserRouter>
  )
}
