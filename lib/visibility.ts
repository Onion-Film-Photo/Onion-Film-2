export type PhotoVisibility = 'immediately' | 'after_event' | 'after_date'

export interface VisibilityEvent {
  photo_visibility: PhotoVisibility
  photo_visible_after: string | null
  status: string
}

export function computeVisibility(event: VisibilityEvent): boolean {
  if (event.photo_visibility === 'immediately') return true
  if (event.photo_visibility === 'after_event') return event.status === 'ended'
  if (event.photo_visibility === 'after_date' && event.photo_visible_after)
    return new Date() >= new Date(event.photo_visible_after)
  return false
}
