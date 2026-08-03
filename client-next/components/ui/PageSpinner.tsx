import { Skeleton } from "@/components/ui/skeleton";

type PageSpinnerProps = {
  heightClass?: string;
  color?: string;
};

export function PageSpinner({ heightClass = "h-[60vh]", color }: PageSpinnerProps) {
  return (
    <div className={`flex ${heightClass} items-center justify-center`}>
      <Skeleton
        className="h-12 w-12 rounded-full"
        style={{ backgroundColor: color ? `${color}40` : undefined }}
      />
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-red-400">{message}</div>
  );
}
