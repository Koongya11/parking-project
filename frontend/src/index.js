import React from "react"
import ReactDOM from "react-dom/client"
import { GoogleOAuthProvider } from "@react-oauth/google"
import App from "./App"
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"

const root = ReactDOM.createRoot(document.getElementById("root"))
const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim()

const appTree = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
)

if (!googleClientId) {
  console.warn("REACT_APP_GOOGLE_CLIENT_ID is not set. Google login will be disabled.")
}

root.render(appTree)

serviceWorkerRegistration.register()
