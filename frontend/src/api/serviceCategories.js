import { apiFetch } from './client'

export function getServiceCategories() {
  return apiFetch('/service-categories')
}
