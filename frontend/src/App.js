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
import AdminStadiums from "./pages/admin/AdminStadiums"
import { useKakaoLoader } from "react-kakao-maps-sdk"


export default function App() {
  const [loading, error] = useKakaoLoader({
    appkey: "3cba1aa3732aedaf48e84e961c8403d8",
    libraries: ["drawing", "services", "clusterer"],
  })
  if (loading) return <div style={{ padding: 16 }}>지도를 준비하는 중…</div>
  if (error) return <div style={{ padding: 16 }}>지도 로딩 오류가 발생했습니다.</div>
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/stadium/:id" element={<StadiumPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/stadiums" element={<AdminStadiums />} />
      </Routes>
      <ReturnFeedback />
    </BrowserRouter>
  )
}

