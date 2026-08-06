"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type BarChartProps = {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
};

export function BarChart({ labels, datasets }: BarChartProps) {
  const data = {
    labels,
    datasets: datasets.map((d, i) => ({
      ...d,
      backgroundColor:
        d.backgroundColor ??
        (i === 0 ? "rgba(59, 130, 246, 0.75)" : "rgba(239, 68, 68, 0.75)"),
      borderColor:
        d.borderColor ?? (i === 0 ? "rgb(59, 130, 246)" : "rgb(239, 68, 68)"),
    })),
  };
  return (
    <div className="w-full max-h-[35vh] flex-grow">
      <Bar
        data={data}
        options={{
          maintainAspectRatio: true,
          responsive: true,
        }}
      />
    </div>
  );
}
