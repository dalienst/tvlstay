/** Turns a YouTube/Vimeo link into an embed, or plays an .mp4 directly. Unknown links show as a plain link. */
export function Video({ url, title }: { url: string; title: string }) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const src = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
  if (src) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe src={src} title={title} className="h-full w-full" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    );
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return <video src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
      Watch the video
    </a>
  );
}
