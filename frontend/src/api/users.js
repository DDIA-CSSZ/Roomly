import { apiFetch } from './client'

export function getStaffUsers() {
  return apiFetch('/auth/staff')
}

export function getUsers() {
  return apiFetch('/auth/users')
}

export function createUser(payload) {
  return apiFetch('/auth/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(userId, payload) {
  return apiFetch(`/auth/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deactivateUser(userId) {
  return apiFetch(`/auth/users/${userId}`, {
    method: 'DELETE',
  })
}
