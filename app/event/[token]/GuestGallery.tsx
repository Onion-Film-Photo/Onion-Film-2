import type { PhotoVisibility } from '@/lib/visibility'

export type GuestPhoto = {
  id: string
  url: string | null
  filter: string
  created_at: string
}

type Props = {
  photos: GuestPhoto[]
  isVisible: boolean
  photoVisibility: PhotoVisibility
  photoVisibleAfter: string | null
}

export default function GuestGallery({ photos, isVisible, photoVisibility, photoVisibleAfter }: Props) {
  if (photos.length === 0) return null

  let lockMessage = ''
  if (!isVisible) {
    if (photoVisibility === 'after_event') {
      lockMessage = 'Photos revealed when the event ends'
    } else if (photoVisibility === 'after_date' && photoVisibleAfter) {
      const date = new Date(photoVisibleAfter)
      lockMessage = `Photos revealed on ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
    }
  }

  return (
    <section className="guest-gallery">
      <div className="guest-gallery__header">
        <span className="guest-gallery__count">
          {photos.length} {photos.length === 1 ? 'shot' : 'shots'} taken
        </span>
        {!isVisible && lockMessage && (
          <span className="guest-gallery__lock">&#128274; {lockMessage}</span>
        )}
      </div>
      <div className="guest-gallery__grid">
        {photos.map((photo, i) => (
          <div key={photo.id} className="guest-gallery__tile">
            {isVisible && photo.url ? (
              <img
                src={photo.url}
                alt={`Photo ${i + 1}`}
                className="guest-gallery__tile-img"
              />
            ) : (
              <div className="guest-gallery__tile-placeholder">
                <span className="guest-gallery__tile-lock">&#128274;</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
