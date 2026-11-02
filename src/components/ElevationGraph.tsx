import { useEffect, useMemo, useRef } from "react";
import { theme } from "antd";
import * as d3 from "d3";
const { useToken } = theme;
import { usePlaylistContext } from "../data/PlaylistContext";
import { useCourseContext } from "../data/CourseContext";
import { RuniflySong } from "../hooks/useSpotifyPlaylist";
import {
  courseKilometres,
  elevationSamples,
  kilometreX,
  wholeKilometreTicks,
  type ElevationSample,
} from "./elevationGeometry";

const setupSvg = (svgRef: React.RefObject<SVGSVGElement | null>) => {
  return d3
    .select(svgRef.current)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("overflow", "visible");
};
const margin = { top: 10, right: 0, bottom: 10, left: 10 };

export const ElevationGraph: React.FC = () => {
  const { token } = useToken();
  const svgRef = useRef<SVGSVGElement>(null);
  const { hoveredSong, songs, sethoveredSong } = usePlaylistContext();
  const { gpx } = useCourseContext();
  const chartData = useMemo(() => elevationSamples(gpx.points), [gpx]);
  const routeKilometres = courseKilometres(gpx.points);

  useEffect(() => {
    const { svg, width, height } = getChart(svgRef, routeKilometres, chartData);

    if (!svgRef.current) return;

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

    const from = kilometreX(hoveredSong.lapFrom, routeKilometres, width);
    const to = kilometreX(hoveredSong.lapTo, routeKilometres, width);
    const songRect = svg.append("rect").attr("class", "hoveredSongRect");
    const callout = svg.append("foreignObject").attr("class", "hoveredCallout");
    songRect
      .attr("x", margin.left + from)
      .attr("y", margin.top)
      .attr("width", to - from)
      .attr("height", height)
      .attr("fill", "rgba(0, 0, 0, 0.5)");

    callout
      .attr("x", margin.left + to + 10)
      .attr("y", margin.top)
      .attr("width", 200)
      .attr("height", 50)
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
  }, [hoveredSong, token.colorPrimary, routeKilometres, chartData]);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;

    const { width } = getChart(svgRef, routeKilometres, chartData);

    const onMouseMove = (event: MouseEvent) => {
      const mouseX = d3.pointer(event, node)[0] - margin.left;
      let newSong: RuniflySong | null = null;
      for (const song of songs) {
        const from = kilometreX(song.lapFrom, routeKilometres, width);
        const to = kilometreX(song.lapTo, routeKilometres, width);
        if (from <= mouseX && mouseX <= to) {
          newSong = song;
          break;
        }
      }
      if (newSong && newSong !== hoveredSong) {
        sethoveredSong(newSong);
      }
    };

    const onMouseOut = () => {
      sethoveredSong(undefined);
    };

    node.addEventListener("mousemove", onMouseMove);
    node.addEventListener("mouseout", onMouseOut);
    return () => {
      node.removeEventListener("mousemove", onMouseMove);
      node.removeEventListener("mouseout", onMouseOut);
    };
  }, [chartData, routeKilometres, hoveredSong, sethoveredSong, songs]);

  useEffect(() => {
    const { svg, xScale, height, yScale, width } = getChart(
      svgRef,
      routeKilometres,
      chartData
    );

    svg.selectAll("*").remove(); // This line removes all child elements of the SVG

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const generateScaledArea = d3
      .area()
      .x((d) => kilometreX(d[0], routeKilometres, width))
      .y0(height)
      .y1((d) => yScale(d[1]))
      .curve(d3.curveCardinal);

    const chartDataTuples = chartData.map((d) => [d.kilometre, d.elevation]) as [
      number,
      number,
    ][];

    g.append("path")
      .datum(chartDataTuples)
      .attr("stroke", token.colorPrimary)
      .attr("stroke-width", 2)
      .attr("fill", token.colorPrimary + "50")
      .attr("d", () => generateScaledArea(chartDataTuples));

    const xAxis: d3.Axis<number | { valueOf(): number }> = d3
      .axisBottom(xScale)
      .tickFormat((d) =>
        Math.round(typeof d === "number" ? d : d.valueOf()).toString()
      )
      .tickValues(wholeKilometreTicks(routeKilometres));

    const yAxis = d3.axisLeft(yScale).ticks(7);
    g.append("g").call(xAxis).attr("transform", `translate(0,${height})`);
    g.append("g").call(yAxis);
  }, [chartData, routeKilometres, token.colorPrimary]);

  return <svg ref={svgRef} />;
};

function getChart(
  svgRef: React.RefObject<SVGSVGElement | null>,
  routeKilometres: number,
  chartData: ElevationSample[]
) {
  const svg = setupSvg(svgRef);

  const svgNode = svg.node();
  const width =
    (svgNode?.getBoundingClientRect().width || 0) - margin.left - margin.right;
  const height =
    (svgNode?.getBoundingClientRect().height || 0) - margin.top - margin.bottom;

  const xScale = d3
    .scaleLinear()
    .domain([0, routeKilometres])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([
      Math.min(0, d3.min(chartData, (d) => d.elevation) || 0),
      Math.max(100, d3.max(chartData, (d) => d.elevation) || 0),
    ])
    .range([height, 0]);
  return { svg, xScale, width, height, yScale };
}
