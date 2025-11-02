/* eslint-disable no-restricted-globals */

import { clientsClaim } from "workbox-core"
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { StaleWhileRevalidate } from "workbox-strategies"

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$")

registerRoute(
  ({ request, url }) => {
    if (request.mode !== "navigate") {
      return false
    }

    if (url.pathname.startsWith("/_")) {
      return false
    }

    if (url.pathname.match(fileExtensionRegexp)) {
      return false
    }

    return true
  },
  createHandlerBoundToURL(`${process.env.PUBLIC_URL}/index.html`)
)

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.startsWith("/static/"),
  new StaleWhileRevalidate({
    cacheName: "static-resources",
  })
)

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
