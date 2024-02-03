import { useEffect, useRef, useState } from "react";
import { GlobalToken, theme } from "antd";
import * as d3 from "d3";
import { Gpx } from "../utils/gpxUtils";
const { useToken } = theme;

interface ElevationGraphProps {
  gpx: Gpx;
}

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

    // Calculate the total number of elevation points across all laps
    const totalPoints = gpx.laps.reduce(
      (total, lap) => total + lap.elevations.length,
      0
    );

    // Map each elevation point to its relative position within the total number of points
    const data = gpx.laps.flatMap((lap, index) =>
      lap.elevations.map((elevation, elIndex, elevationsArray) => ({
        lap: index + elIndex / elevationsArray.length,
        elevation,
      }))
    );

    console.log(data);
    const width =
      svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height =
      svg.node().getBoundingClientRect().height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, gpx.laps.length])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(data, (d) => d.elevation),
        d3.max(data, (d) => d.elevation),
      ])
      .range([height, 0]);

    const generateScaledArea = d3
      .area()
      .x((d) => xScale(d.lap))
      .y0(height)
      .y1((d) => yScale(d.elevation))
      .curve(d3.curveCardinal);

    g.append("path")
      .datum(data)
      .attr("stroke", token.colorPrimary)
      .attr("stroke-width", 2)
      .attr("fill", token.colorPrimary + "50")
      .attr("d", generateScaledArea);

    const xAxis = d3
      .axisBottom(xScale)
      //.tickFormat((i) => i + 1)
      .tickFormat((d) => Math.round(d))
      .ticks(Math.min(gpx.laps.length, 50));
    //.tickSize(-height) // This line makes the ticks go inside the graph

    const yAxis = d3.axisLeft(yScale).ticks(7);
    g.append("g").call(xAxis).attr("transform", `translate(0,${height})`);
    g.append("g").call(yAxis);

    addRunningMan(svg, svgRef, xScale, yScale, data, token);

    d3.select(svgRef.current)
      .append("rect")
      .attr("x", xScale(1.5))
      .attr("y", 10)
      .attr("width", xScale(2.25) - xScale(1.5))
      .attr("height", height)
      .attr("fill", "rgba(0, 0, 0, 0.5)");
  }, [gpx, token]);

  return <svg ref={svgRef} />;
};

function addRunningMan(svg, svgRef, xScale, yScale, data, token: GlobalToken) {
  // Create an SVG element for the running man
  const runningMan = svg
    .append("svg")
    .attr("width", 24) // Adjust the size as needed
    .attr("height", 24) // Adjust the size as needed
    .style("display", "none");

  // Add the inline SVG to the runningMan element
  runningMan.html(`
  <svg width="24" height="24" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path d="M146.5,53.8c3.2-5.4,8.6-8.6,14-4.3l19.3,12.9c8.6,6.4,3.2,14,1.1,17.2l-48.4,78.5c-2.1,3.2-5.4,4.3-8.6,2.1c0,0-1.1-1.1-15-9.7c-14-8.6-10.8-21.5-3.2-34.4L146.5,53.8z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
  <path d="M187.4,0.1c14.9,0,26.9,12,26.9,26.9c0,14.9-12,26.9-26.9,26.9c-14.9,0-26.9-12-26.9-26.9C160.5,12.1,172.5,0.1,187.4,0.1z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
  <path d="M157.3,47.4l-40.9-14c-3.2-1.1-7.5-1.1-9.7,0L60.5,58.1c-6.4,3.2-8.6,10.8-5.4,16.1c2.1,4.3,5.4,6.4,9.7,6.4c2.1,0,4.3,0,6.4-1.1l41.9-21.5L149.7,71c6.4,2.1,12.9-1.1,15.1-7.5C167,56,163.7,49.5,157.3,47.4z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
  <path d="M89.5,145.2l-14,19.3H25.1l0,0c-7.5,0-15.1,6.4-15.1,14c0,8.6,6.4,15.1,15,15.1h59.1l0,0c5.4,0,9.7-2.1,12.9-7.5l14-20.4C110,165.6,90.6,152.7,89.5,145.2z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
  <path d="M175.6,163.5L124,125.9c-6.4-4.3-16.1-3.2-20.4,4.3c-4.3,6.4-3.2,16.1,4.3,20.4l40.9,30.1L124,235.5c-3.2,7.5,0,16.1,7.5,19.3c2.1,1.1,4.3,1.1,6.4,1.1c5.4,0,10.8-3.2,12.9-8.6l29-66.6C183.1,175.3,180.9,167.8,175.6,163.5z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
  <path d="M236.8,116.2l-39.8-9.7l-11.8-36.5c-2.1-6.4-8.6-9.7-15-7.5c-6.4,2.1-9.7,8.6-7.5,15.1l14,43c1.1,4.3,4.3,7.5,8.6,8.6l46.2,11.8h1.1c6.4,1.1,11.8-3.2,12.9-9.7C247.6,123.7,243.3,117.2,236.8,116.2z" stroke="${token.colorPrimary}" stroke-width="1" fill="${token.colorPrimary}"/>
</svg>

  `);

  svg
    .on("mousemove", (event) => {
      // Calculate the mouse x position
      const mouseX = d3.pointer(event, svgRef.current)[0];

      // Find the closest data point
      let minDistance = Infinity;
      let closestDataPoint = null;
      for (const point of data) {
        const distance = Math.abs(xScale(point.lap) - mouseX);
        if (distance < minDistance) {
          minDistance = distance;
          closestDataPoint = point;
        }
      }

      // Update the position of the running man
      runningMan
        .attr("x", xScale(closestDataPoint.lap) + 0) // Adjust the offset as needed
        .attr("y", yScale(closestDataPoint.elevation) - 24) // Adjust the offset as needed
        .style("display", null);
    })
    .on("mouseout", () => {
      runningMan.style("display", "none");
    });
}
