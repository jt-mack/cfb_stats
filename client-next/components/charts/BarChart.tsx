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
    datasets: datasets.map((d) => ({
      ...d,
      backgroundColor: d.backgroundColor ?? "rgba(0,0,0,0.2)",
      borderColor: d.borderColor ?? "rgba(0,0,0,0.5)",
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
