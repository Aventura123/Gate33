import React from "react";
import ApexCharts from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface EvolutionChartProps {
  data: {
    date: string;
    jobs: number;
    instantJobs: number;
    learn2earn: number;
  }[];
}

const EvolutionChart: React.FC<EvolutionChartProps> = ({ data }) => {
  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
      background: "transparent",
      toolbar: { show: false },
      fontFamily: 'inherit',
      zoom: { enabled: false },
    },
    xaxis: {
      categories: data.map((d) => d.date),
      labels: { style: { colors: '#fbbf24', fontSize: '14px' } },
    },
    yaxis: {
      labels: { style: { colors: '#fbbf24', fontSize: '14px' } },
    },
    legend: {
      labels: { colors: '#fbbf24' },
      fontWeight: 600,
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    colors: ["#fbbf24", "#fb923c", "#34d399"],
    grid: {
      borderColor: '#444',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '15px', fontFamily: 'inherit' },
    },
    markers: {
      size: 5,
      colors: ['#fbbf24', '#fb923c', '#34d399'],
      strokeColors: '#222',
      strokeWidth: 2,
      hover: { sizeOffset: 2 },
    },
  };

  const series = [
    {
      name: "Jobs",
      data: data.map((d) => d.jobs),
    },
    {
      name: "Instant Jobs",
      data: data.map((d) => d.instantJobs),
    },
    {
      name: "Learn2Earn",
      data: data.map((d) => d.learn2earn),
    },
  ];

  return (
    <div className="bg-black/70 rounded-lg p-6 mt-4 shadow-lg flex flex-col items-stretch">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-yellow-400 tracking-tight">Evolution of Jobs and Activities</h3>
        {/* Optional: Download button for analytics */}
        {/* <button className="text-xs text-gray-300 hover:text-yellow-400 border border-gray-600 rounded px-2 py-1 transition-colors">Export</button> */}
      </div>
      <ApexCharts options={chartOptions} series={series} type="line" height={260} />
    </div>
  );
};

export default EvolutionChart;
