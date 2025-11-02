import axios from "axios"

const baseURL =
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api").trim()

const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("ADMIN_TOKEN")
  if (adminToken) config.headers["x-admin-token"] = adminToken
  const userToken = localStorage.getItem("USER_TOKEN")
  if (userToken) config.headers["x-user-token"] = userToken
  return config
})

export default api
