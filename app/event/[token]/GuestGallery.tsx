import type { PhotoVisibility } from '@/lib/visibility';

export type GuestPhoto = {
  id: string;
  url: string | null;
  filter: string;
  created_at: string;
};

export type GuestVideo = {
  id: string;
  url: string | null;
  filter: string;
  duration_seconds: number;
  created_at: string;
};

type Props = {
  photos: GuestPhoto[];
  videos: GuestVideo[];
  isVisible: boolean;
  photoVisibility: PhotoVisibility;
  photoVisibleAfter: string | null;
};

export default function GuestGallery({
  photos,
  videos,
  isVisible,
  photoVisibility,
  photoVisibleAfter,
}: Props) {
  if (photos.length === 0 && videos.length === 0) return null;

  let lockMessage = '';
  if (!isVisible) {
    if (photoVisibility === 'after_event') {
      lockMessage =
        'The host have decided to reveal photos & clips when the event ends';
    } else if (photoVisibility === 'after_date' && photoVisibleAfter) {
      const date = new Date(photoVisibleAfter);
      lockMessage = `Photos & clips revealed on ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
    }
  }

  // Merge photos and videos into a unified chronological feed
  type Item =
    | { kind: 'photo'; data: GuestPhoto }
    | { kind: 'video'; data: GuestVideo };

  const items: Item[] = [
    ...photos.map((p) => ({ kind: 'photo' as const, data: p })),
    ...videos.map((v) => ({ kind: 'video' as const, data: v })),
  ].sort(
    (a, b) =>
      new Date(a.data.created_at).getTime() -
      new Date(b.data.created_at).getTime(),
  );

  const total = photos.length + videos.length;

  return (
    <section className="guest-gallery">
      <div className="guest-gallery__header">
        <span className="guest-gallery__count">
          {photos.length} {photos.length === 1 ? 'shot' : 'shots'} taken
          {videos.length > 0 &&
            ` · ${videos.length} ${videos.length === 1 ? 'clip' : 'clips'}`}
        </span>
        {!isVisible && lockMessage && (
          <span className="guest-gallery__lock">&#128274; {lockMessage}</span>
        )}
      </div>
      <div className="guest-gallery__grid">
        {items.map((item, i) => (
          <div key={item.data.id} className="guest-gallery__tile">
            {isVisible && item.data.url ? (
              item.kind === 'photo' ? (
                <img
                  src={item.data.url}
                  alt={`Shot ${i + 1}`}
                  className="guest-gallery__tile-img"
                />
              ) : (
                <video
                  src={item.data.url}
                  className="guest-gallery__tile-img"
                  controls
                  playsInline
                  preload="metadata"
                  style={{ objectFit: 'cover' }}
                />
              )
            ) : (
              <div className="guest-gallery__tile-placeholder">
                {item.kind === 'video' ? (
                  <span className="guest-gallery__tile-lock">&#127909;</span>
                ) : (
                  <span className="guest-gallery__tile-lock">&#128274;</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
