import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../api"
import CATEGORIES from "../data/categories"

export default function CategoryPage() {
    const { categoryId } = useParams()
    const navigate = useNavigate()
    const category = CATEGORIES.find(c => c.id === categoryId)
    const [stadiums, setStadiums] = useState([])

    useEffect(() => {
        if (!category) return
        api.get("/stadiums", { params: { category: categoryId } })
            .then(res => setStadiums(res.data))
            .catch(() => setStadiums([]))
    }, [category, categoryId])

    if (!category) {
        return (
            <div className="container">
                <h1>카테고리를 찾을 수 없습니다</h1>
                <button className="back-btn" onClick={() => navigate("/")}>메인으로</button>
            </div>
        )
    }

    const goStadium = (s) => {
        navigate(`/stadium/${s._id}`, { state: { stadium: s } })   // ✅ state로 데이터 전달
    }

    return (
        <div className="container">
            <div className="header">
                <h1>{category.name}</h1>
                <p className="subtitle">{category.desc}</p>
            </div>

            <div className="grid">
                {stadiums.map(s => (
                    <button key={s._id} className="card" onClick={() => goStadium(s)}>
                        <div className="card-icon">📍</div>
                        <div className="card-texts">
                            <div className="card-title">{s.teamName}</div>
                            <div className="card-desc">{s.stadiumName} · {s.city || "도시 미지정"}</div>
                        </div>
                    </button>
                ))}
                {stadiums.length === 0 && <div className="placeholder">아직 등록된 경기장이 없습니다. 관리자에서 추가하세요.</div>}
            </div>
        </div>
    )
}
