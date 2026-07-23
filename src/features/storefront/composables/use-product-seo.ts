import { onBeforeUnmount, watchEffect } from 'vue'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import type { PublicSeoDto } from '@/api/generated/models'

function setMeta(selector: string, attribute: string, value: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    const [name, content] = attribute.split('=')
    if (name && content) element.setAttribute(name, content)
    document.head.appendChild(element)
  }
  element.setAttribute('content', value)
  return element
}

export function useProductSeo(seo: MaybeRef<PublicSeoDto | null>): void {
  const originalTitle = document.title
  watchEffect(() => {
    const value = unref(seo)
    if (!value) return
    document.title = value.title
    setMeta('meta[name="description"]', 'name=description', value.description)
    setMeta('meta[property="og:title"]', 'property=og:title', value.title)
    setMeta('meta[property="og:description"]', 'property=og:description', value.description)
    if (value.imageUrl) setMeta('meta[property="og:image"]', 'property=og:image', value.imageUrl)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = new URL(value.canonicalPath, window.location.origin).toString()
  })
  onBeforeUnmount(() => {
    document.title = originalTitle
  })
}
