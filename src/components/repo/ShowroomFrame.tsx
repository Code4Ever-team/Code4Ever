"use client";

interface ShowroomFrameProps {
  html: string;
  title: string;
}

/** Statik showroom — yalnızca .pub/index.html içeriği, sandbox iframe. */
export function ShowroomFrame({ html, title }: ShowroomFrameProps) {
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={html}
      className="h-[calc(100vh-4rem)] w-full border-0 bg-black"
    />
  );
}
