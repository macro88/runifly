import { useEffect, useRef, useState } from "react";
import { GlobalToken, theme } from "antd";
import * as d3 from "d3";
import { Gpx } from "../utils/gpxUtils";
const { useToken } = theme;
import finishFlag from "../assets/finishFlag.svg";
import { usePlaylistContext } from "../data/PlaylistContext";
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
const margin = { top: 10, right: 0, bottom: 10, left: 10 };

export const ElevationGraph: React.FC<ElevationGraphProps> = ({ gpx }) => {
  const { token } = useToken();
  const svgRef = useRef();

  const { hoveredSong, songs, sethoveredSong } = usePlaylistContext();

  useEffect(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).select(".hoveredSongRect").remove();

      if (!hoveredSong) {
        d3.select(svgRef.current).select(".hoveredSongRect").remove();
      } else {
        const svg = setupSvg(svgRef);
        const width =
          svg.node().getBoundingClientRect().width - margin.left - margin.right;
        const height =
          svg.node().getBoundingClientRect().height -
          margin.top -
          margin.bottom;

        const xScale = d3
          .scaleLinear()
          .domain([0, gpx.laps.length])
          .range([0, width]);

        d3.select(svgRef.current)
          .append("rect")
          .attr("class", "hoveredSongRect")
          .attr("x", xScale(hoveredSong.lapFrom))
          .attr("y", 10)
          .attr(
            "width",
            xScale(hoveredSong.lapTo) -
              xScale(hoveredSong.lapFrom) +
              margin.left
          )
          .attr("height", height)
          .attr("fill", "rgba(0, 0, 0, 0.5)");
      }
    }
  }, []);

  useEffect(() => {
    const svg = setupSvg(svgRef);
    const width =
      svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height =
      svg.node().getBoundingClientRect().height - margin.top - margin.bottom;
    const xScale = d3
      .scaleLinear()
      .domain([0, gpx.laps.length])
      .range([0, width]);

    if (!hoveredSong) {
      // Hide the rectangle when the mouse is not over the graph
      d3.select(svgRef.current).select(".hoveredSongRect").attr("width", 0);

      // Hide the callout when the mouse is not over the graph
      d3.select(svgRef.current)
        .select(".hoveredCallout")
        .style("display", "none");

      return;
    }

    // Hide the rectangle when the mouse is not over the graph
    d3.select(svgRef.current).select(".hoveredSongRect").remove();
    // Hide the callout when the mouse is not over the graph
    d3.select(svgRef.current).select(".hoveredCallout").remove();

    const songRect = svg.append("rect").attr("class", "hoveredSongRect");
    const callout = svg.append("foreignObject").attr("class", "hoveredCallout");
    songRect
      //.transition()
      //.duration(200) // Adjust as needed
      .attr("x", xScale(hoveredSong.lapFrom))
      .attr("y", 10) // Adjust as needed
      .attr("width", xScale(hoveredSong.lapTo) - xScale(hoveredSong.lapFrom))
      .attr("height", height) // Adjust as needed
      .attr("fill", "rgba(0, 0, 0, 0.5)"); // Adjust as needed

    callout
      .attr("x", xScale(hoveredSong.lapTo) + 10)
      .attr("y", 10) // Adjust as needed
      .attr("width", 200) // Adjust as needed
      .attr("height", 50) // Adjust as needed
      .html(
        `
              <div style="display: flex; align-items: center; width='100%' ">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 512 512">
                  <path fill="${token.colorPrimary}" d="M256 80C149.9 80 62.4 159.4 49.6 262c9.4-3.8 19.6-6 30.4-6c26.5 0 48 21.5 48 48V432c0 26.5-21.5 48-48 48c-44.2 0-80-35.8-80-80V384 336 288C0 146.6 114.6 32 256 32s256 114.6 256 256v48 48 16c0 44.2-35.8 80-80 80c-26.5 0-48-21.5-48-48V304c0-26.5 21.5-48 48-48c10.8 0 21 2.1 30.4 6C449.6 159.4 362.1 80 256 80z"/>
                </svg>
                <span style="margin-left: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%">${hoveredSong.name}</span>
              </div>
            `
      )
      .style("display", null);
  }, [hoveredSong]);

  useEffect(() => {
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
        Math.min(
          0,
          d3.min(data, (d) => d.elevation)
        ),
        Math.max(
          100,
          d3.max(data, (d) => d.elevation)
        ),
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

    //addFinishFlag(svg, xScale, yScale, data);
    addRunningMan(
      svg,
      svgRef,
      xScale,
      yScale,
      data,
      token,
      songs,
      height,
      hoveredSong,
      sethoveredSong
    );
  }, [gpx, token]);

  return <svg ref={svgRef} />;
};

function addRunningMan(
  svg,
  svgRef,
  xScale,
  yScale,
  data,
  token: GlobalToken,
  songs,
  height,
  hoveredSong,
  sethoveredSong
) {
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

  const runningManOn = false;
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

      // Find the song that the mouse is over
      let newSong = null;
      for (const song of songs) {
        if (xScale(song.lapFrom) <= mouseX && mouseX <= xScale(song.lapTo)) {
          newSong = song;
          break;
        }
      }

      // If the mouse is over a new song, update the rectangle's position and size
      if (newSong !== hoveredSong) {
        if (!newSong) {
          sethoveredSong(newSong);
        }
        //currentSong = newSong;
        sethoveredSong(newSong);
      }

      if (runningManOn) {
        // Update the position of the running man
        runningMan
          .attr("x", xScale(closestDataPoint.lap) + 0) // Adjust the offset as needed
          .attr("y", yScale(closestDataPoint.elevation) - 24) // Adjust the offset as needed
          .style("display", null);
      }
    })
    .on("mouseout", () => {
      if (runningManOn) {
        runningMan.style("display", "none");
      }

      //currentSong = null;
      sethoveredSong(null);
    });
}
