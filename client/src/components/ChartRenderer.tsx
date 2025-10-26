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

// Get brand primary color from CSS variables or fallback to default
const getBrandColor = () => {
  const root = document.documentElement;
  const primaryHSL = getComputedStyle(root)
    .getPropertyValue("--primary")
    .trim();

  if (primaryHSL) {
    // Convert HSL to hex
    const [h, s, l] = primaryHSL.split(" ").map((v) => parseFloat(v));
    return hslToHex(h, s, l);
  }

  return "#8884d8"; // Fallback to default blue
};

// Convert HSL to Hex
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  className = "",
}) => {
  const brandColor = getBrandColor();
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
              stroke={brandColor}
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
            <Bar dataKey="value" fill={brandColor} name={yLabel} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
