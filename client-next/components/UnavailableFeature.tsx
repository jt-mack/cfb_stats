"use client";

type UnavailableFeatureProps = {
  message: string;
  className?: string;
};

export function UnavailableFeature({
  message,
  className = "py-8 text-center text-muted-foreground",
}: UnavailableFeatureProps) {
  return <p className={className}>{message}</p>;
}
