import axios from "axios"
const api = axios.create({ baseURL: "http://localhost:5000/api" })

// 관리자 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ADMIN_TOKEN")
  if (token) config.headers["x-admin-token"] = token
  return config
})

export default api
