import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"

const PAGE_SIZE = 20

export default function AdminCommunity() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [stadiums, setStadiums] = useState([])
  const [stadiumFilter, setStadiumFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("ADMIN_TOKEN")
    if (!token) navigate("/admin/login", { replace: true })
  }, [navigate])

  useEffect(() => {
    api
      .get("/stadiums")
      .then((res) => setStadiums(res.data || []))
      .catch(() => setStadiums([]))
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => setSearchTerm(searchInput.trim()), 300)
    return () => clearTimeout(debounce)
  }, [searchInput])

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError("")
      try {
        const { data } = await api.get("/admin/community-posts", {
          params: {
            stadiumId: stadiumFilter || undefined,
            q: searchTerm || undefined,
            page,
            limit: PAGE_SIZE,
          },
        })
        setPosts(data?.items || [])
        setTotal(data?.total || 0)
      } catch (err) {
        console.error("failed to load community posts", err)
        const message = err?.response?.data?.message || "게시글을 불러오지 못했습니다."
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [stadiumFilter, searchTerm, page])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const handleDelete = async (postId) => {
    if (!postId) return
    if (!window.confirm("이 게시글을 삭제할까요?")) return
    setDeletingId(postId)
    try {
      await api.delete(`/admin/community-posts/${postId}`)
      setPosts((prev) => prev.filter((post) => post._id !== postId))
      setTotal((prev) => Math.max(prev - 1, 0))
    } catch (error) {
      console.error("admin delete post failed", error)
      const message = error?.response?.data?.message || "게시글 삭제에 실패했습니다."
      alert(message)
    } finally {
      setDeletingId("")
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">커뮤니티 관리</h1>
          <p className="page-hero__subtitle">게시글을 검토하고 부적절한 내용을 빠르게 삭제하세요.</p>
        </div>
        <button type="button" className="cta-button" onClick={() => navigate("/admin")}>
          관리자 홈
        </button>
      </header>

      <section className="admin-toolbar">
        <label>
          경기장
          <select value={stadiumFilter} onChange={(event) => setStadiumFilter(event.target.value)}>
            <option value="">전체</option>
            {stadiums.map((stadium) => (
              <option key={stadium._id} value={stadium._id}>
                {stadium.stadiumName}
              </option>
            ))}
          </select>
        </label>
        <label>
          검색
          <input
            type="text"
            value={searchInput}
            placeholder="제목, 내용, 작성자 검색"
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </section>

      {error && <div className="empty-state">{error}</div>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>작성일</th>
              <th>경기장</th>
              <th>제목</th>
              <th>작성자</th>
              <th>조회수</th>
              <th>추천</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
            {loading ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  불러오는 중...
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post._id}>
                  <td>{post.createdAt ? new Date(post.createdAt).toLocaleString() : "-"}</td>
                  <td>{post.stadiumName || "-"}</td>
                  <td>{post.title}</td>
                  <td>{post.authorName}</td>
                  <td>{post.views}</td>
                  <td>{post.recommendCount}</td>
                  <td>
                    <div className="admin-table__actions">
                      <button type="button" onClick={() => navigate(`/stadium/${post.stadiumId}/community/${post._id}`)}>
                        보기
                      </button>
                      <button type="button" onClick={() => handleDelete(post._id)} disabled={deletingId === post._id}>
                        {deletingId === post._id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="pagination">
          <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>
            이전
          </button>
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1
            return (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === page ? "is-active" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
