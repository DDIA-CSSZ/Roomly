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

export function getRequestById(requestId) {
  return apiFetch(`/requests/${requestId}`)
}

export function createRequest(payload) {
  return apiFetch('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRequestPriority(requestId, priority) {
  return apiFetch(`/requests/${requestId}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  })
}

export function getRequestComments(requestId) {
  return apiFetch(`/requests/${requestId}/comments`)
}

export function createRequestComment(requestId, body) {
  return apiFetch(`/requests/${requestId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function getRequestEvents(requestId) {
  return apiFetch(`/requests/${requestId}/events`)
}

export function assignRequest(requestId, assignedToId) {
  return apiFetch(`/requests/${requestId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assigned_to_id: Number(assignedToId) }),
  })
}

export function updateRequestStatus(requestId, status) {
  return apiFetch(`/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function updateMyRequest(requestId, payload) {
  return apiFetch(`/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function cancelMyRequest(requestId) {
  return apiFetch(`/requests/${requestId}/cancel`, {
    method: 'PATCH',
  })
}

export function getRequestsForRole(role) {
  if (role === 'guest') return getMyRequests()
  if (role === 'staff') return getAssignedRequests()
  if (role === 'receptionist' || role === 'admin') return getAllRequests()
  return Promise.resolve([])
}

export async function getRequestByIdForRole(id) {
  return getRequestById(id)
}
