import { apiFetch } from './client'

export function getRooms() {
  return apiFetch('/rooms')
}
