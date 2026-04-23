/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from 'react';

/** 可用于 <img src> 的远程地址（排除 `#`、空串及非 http(s)） */
export function isHttpImageUrl(url?: string | null): boolean {
  if (url == null) return false;
  const u = url.trim();
  if (!u || u === '#') return false;
  return /^https?:\/\//i.test(u) || u.startsWith('//');
}

export function picsumCover(seed: string, width: number, height: number): string {
  const safe = (seed || 'x').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return `https://picsum.photos/seed/${safe}/${width}/${height}`;
}

export function noticeCoverSrc(noticeId: string, attachmentUrl?: string | null, width = 800, height = 450): string {
  if (isHttpImageUrl(attachmentUrl)) return attachmentUrl!.trim();
  return picsumCover(noticeId, width, height);
}

type NoticeCoverImageProps = {
  noticeId: string;
  preferredUrl?: string | null;
  width?: number;
  height?: number;
  className?: string;
};

export function NoticeCoverImage({ noticeId, preferredUrl, width = 800, height = 450, className }: NoticeCoverImageProps) {
  const w = width;
  const h = height;
  const [src, setSrc] = useState(() => noticeCoverSrc(noticeId, preferredUrl, w, h));
  const retried = useRef(false);

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => {
        if (retried.current) return;
        retried.current = true;
        setSrc(picsumCover(`${noticeId}_fb`, w, h));
      }}
    />
  );
}
