"use client";

type WinPercentageProps = {
  logoUrl?: string;
  percentage: string | number;
  color?: string;
  size?: number;
  small?: boolean;
};

export function WinPercentage({
  logoUrl = "",
  percentage,
  color = "gray",
  size = 175,
  small = false,
}: WinPercentageProps) {
  const adjustedSize = small ? size * 0.5 : size;
  const radius = adjustedSize / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const pct = Number(percentage);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-block"
      style={{ width: adjustedSize, height: adjustedSize }}
    >
      <svg
        width={adjustedSize}
        height={adjustedSize}
        viewBox={`0 0 ${adjustedSize} ${adjustedSize}`}
      >
        <circle
          cx={adjustedSize / 2}
          cy={adjustedSize / 2}
          r={radius}
          strokeWidth={small ? 5 : 10}
          stroke="#e5e7eb"
          fill="none"
        />
        <circle
          cx={adjustedSize / 2}
          cy={adjustedSize / 2}
          r={radius}
          strokeWidth={small ? 5 : 10}
          stroke={color}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ fontSize: small ? "0.6em" : "1.2em" }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mx-auto block rounded-full"
            style={{
              width: small ? 25 : 50,
              height: small ? 25 : 50,
            }}
          />
        ) : null}
        <span className="block mt-1 font-semibold text-zinc-100">
          {`${Number(percentage)}%`}
        </span>
      </div>
    </div>
  );
}
