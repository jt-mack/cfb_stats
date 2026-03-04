"use client";

import { Card, CardContent } from "@/components/ui/card";

type ImageCardProps = {
  title: string;
  imgSrc?: string | null;
  imgName?: string;
  text?: string;
  sub_text?: string;
};

export function ImageCard({
  title,
  imgSrc,
  imgName,
  text,
  sub_text,
}: ImageCardProps) {
  return (
    <Card className="overflow-hidden bg-zinc-800 border-zinc-700">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={imgName ?? title}
          className="w-full object-cover h-40"
        />
      ) : (
        <div className="h-40 bg-zinc-700 flex items-center justify-center">
          <span className="text-zinc-400 text-sm">{imgName ?? "—"}</span>
        </div>
      )}
      <CardContent className="p-4 text-zinc-100">
        <h3 className="font-semibold text-lg">{title}</h3>
        {text ? <p className="text-sm text-zinc-300 mt-1">{text}</p> : null}
        {sub_text ? (
          <p className="text-xs text-zinc-400 mt-1">{sub_text}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
