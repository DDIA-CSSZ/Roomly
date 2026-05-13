import { apiFetch } from './client'

export function getMyRequests() {
  return apiFetch('/requests/me')
}

export function getAllRequests() {
  return apiFetch('/requests')
}

export function getAssignedRequests() {
  return apiFetch('/requests/assigned')
}

export function getRequestsForRole(role) {
  if (role === 'guest') return getMyRequests()
  if (role === 'staff') return getAssignedRequests()
  if (role === 'receptionist' || role === 'admin') return getAllRequests()
  return Promise.resolve([])
}
