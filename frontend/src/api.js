import axios from "axios"
const api = axios.create({ baseURL: "http://localhost:5000/api" })

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("ADMIN_TOKEN")
  if (adminToken) config.headers["x-admin-token"] = adminToken
  const userToken = localStorage.getItem("USER_TOKEN")
  if (userToken) config.headers["x-user-token"] = userToken
  return config
})

export default api
