import { apiFetch } from './client'

export function getRooms() {
  return apiFetch('/rooms')
}

export function getRoomOccupancy() {
  return apiFetch('/rooms/occupancy')
}

export function createRoom(payload) {
  return apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function checkInGuest(roomId, userId) {
  return apiFetch(`/rooms/${roomId}/check-in`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: Number(userId) }),
  })
}

export function checkOutGuest(roomId) {
  return apiFetch(`/rooms/${roomId}/check-out`, {
    method: 'PATCH',
  })
}
