interface VideoPlayerProps {
  /**
   * Ссылка на YouTube-видео — сюда попадает lesson.videoUrl (видеоурок) или
   * lesson.reviewVideoUrl (видеоразбор теста). Поддерживаются форматы:
   * https://www.youtube.com/watch?v=XXXXXXXXXXX
   * https://youtu.be/XXXXXXXXXXX
   * https://www.youtube.com/embed/XXXXXXXXXXX
   */
  url: string;
  title: string;
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.replace("/embed/", "");
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.replace("/shorts/", "");
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  // <-- ЗДЕСЬ ссылка с YouTube (проп `url`) превращается в embed-ссылку.
  // Именно `url` — то место, куда учительница/бэкенд передаёт ссылку на
  // видеоурок (lesson.videoUrl) или видеоразбор (lesson.reviewVideoUrl).
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="video-player">
        <div className="video-player__error">Некорректная ссылка на видео</div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
