import { useEffect, useRef, useState } from "react";
import { theme } from "antd";
import * as d3 from "d3";
import { Gpx } from "../utils/gpxUtils";
const { useToken } = theme;

interface ElevationGraphProps {
  gpx: Gpx;
}

const generateData = () => {
  return [25, 70, 45, 60, 46, 44, 60, 32, 80, 40, 100];
};

const setupSvg = (svgRef) => {
  return d3
    .select(svgRef.current)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("overflow", "visible");
};

export const ElevationGraph: React.FC<ElevationGraphProps> = ({ gpx }) => {
  const { token } = useToken();
  const svgRef = useRef();

  useEffect(() => {
    const margin = { top: 10, right: 0, bottom: 10, left: 10 };
    const svg = setupSvg(svgRef);
    svg.selectAll("*").remove(); // This line removes all child elements of the SVG

    //    const data = gpx.points.map((p) => p.elevation);

    // Flatten the elevations arrays from all laps into a single array
    const data = gpx.laps.flatMap((lap) => lap.elevations);

    const width =
      svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height =
      svg.node().getBoundingClientRect().height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, gpx.laps.length - 1])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([d3.min(data), d3.max(data)])
      .range([height, 0]);

    const generateScaledArea = d3
      .area()
      .x((d, i) => xScale(i))
      .y0(height)
      .y1(yScale)
      .curve(d3.curveCardinal);

    g.append("path")
      .datum(data)
      .attr("stroke", token.colorPrimary)
      .attr("stroke-width", 2)
      .attr("fill", token.colorPrimary + "50")
      .attr("d", generateScaledArea);

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(data.length, 50))
      //.tickSize(-height) // This line makes the ticks go inside the graph
      .tickFormat((i) => i + 1);

    const yAxis = d3.axisLeft(yScale).ticks(7);
    g.append("g").call(xAxis).attr("transform", `translate(0,${height})`);
    g.append("g").call(yAxis);
  }, [gpx]);

  return <svg ref={svgRef} />;
};
