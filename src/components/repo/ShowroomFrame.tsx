"use client";

interface ShowroomFrameProps {
  html: string;
  title: string;
}

/** Kullanıcının .pub/index.html — tam ekran sandbox iframe, navbar yok. */
export function ShowroomFrame({ html, title }: ShowroomFrameProps) {
  return (
    <iframe
      title={title}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      srcDoc={html}
      className="block h-full w-full border-0 bg-black"
    />
  );
}
