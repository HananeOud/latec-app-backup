import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TableData {
  headers: string[];
  rows: string[][];
  chart_config: {
    type: "bar" | "line";
    x_column: number;
    y_column: number;
  };
}

interface ChartRendererProps {
  data: TableData;
  className?: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  className = "",
}) => {
  // Transform table data into chart format
  const chartData = data.rows.map((row) => {
    const xValue = row[data.chart_config.x_column] || "";
    const yValue = row[data.chart_config.y_column] || "0";

    // Try to parse y value as number, remove commas
    const numericValue = parseFloat(yValue.replace(/,/g, "")) || 0;

    return {
      name: xValue,
      value: numericValue,
    };
  });

  const xLabel = data.headers[data.chart_config.x_column] || "Category";
  const yLabel = data.headers[data.chart_config.y_column] || "Value";

  const commonProps = {
    width: 500,
    height: 300,
    data: chartData,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  return (
    <div className={`my-4 ${className}`}>
      <ResponsiveContainer width="100%" height={300}>
        {data.chart_config.type === "line" ? (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              label={{ value: xLabel, position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{ value: yLabel, angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              strokeWidth={2}
              name={yLabel}
            />
          </LineChart>
        ) : (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              label={{ value: xLabel, position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{ value: yLabel, angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name={yLabel} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
