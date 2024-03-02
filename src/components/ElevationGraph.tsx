import { MutableRefObject, useEffect, useRef, useState } from "react";
import { theme } from "antd";
import * as d3 from "d3";
import { Gpx } from "../utils/gpxUtils";
const { useToken } = theme;
import { usePlaylistContext } from "../data/PlaylistContext";
import { useCourseContext } from "../data/CourseContext";
import { RuniflySong } from "../hooks/useSpotifyPlaylist";

type DataPoint = {
  lap: number;
  elevation: number;
};

const setupSvg = (svgRef: { current: never }) => {
  return d3
    .select(svgRef.current)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("overflow", "visible");
};
const margin = { top: 10, right: 0, bottom: 10, left: 10 };

export const ElevationGraph: React.FC = () => {
  const { token } = useToken();
  const svgRef = useRef();
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const { hoveredSong, songs, sethoveredSong } = usePlaylistContext();
  const { gpx } = useCourseContext();

  useEffect(() => {
    const { svg, xScale, height } = getChart(svgRef, gpx, chartData);

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

    const songRect = svg.append("rect").attr("class", "hoveredSongRect");
    const callout = svg.append("foreignObject").attr("class", "hoveredCallout");
    songRect
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
  }, [hoveredSong, token.colorPrimary, gpx, chartData]);

  useEffect(() => {
    const { svg, xScale } = getChart(svgRef, gpx, chartData);

    svg
      .on("mousemove", (event) => {
        // Calculate the mouse x position
        const mouseX = d3.pointer(event, svgRef.current)[0];

        // Find the closest data point
        let minDistance = Infinity;

        for (const point of chartData) {
          const distance = Math.abs(xScale(point.lap) - mouseX);
          if (distance < minDistance) {
            minDistance = distance;
          }
        }

        // Find the song that the mouse is over
        let newSong: RuniflySong | null = null;
        for (const song of songs) {
          if (xScale(song.lapFrom) <= mouseX && mouseX <= xScale(song.lapTo)) {
            newSong = song;
            break;
          }
        }

        // If the mouse is over a new song, update the rectangle's position and size
        if (newSong != undefined && newSong !== hoveredSong) {
          if (!newSong) {
            sethoveredSong(newSong);
          }
          //currentSong = newSong;
          sethoveredSong(newSong);
        }
      })
      .on("mouseout", () => {
        sethoveredSong(undefined);
      });
  }, [chartData, gpx, hoveredSong, sethoveredSong, songs]);

  useEffect(() => {
    const data: DataPoint[] = gpx.laps.flatMap((lap, index) =>
      lap.elevations.map((elevation, elIndex, elevationsArray) => ({
        lap: index + elIndex / elevationsArray.length,
        elevation,
      }))
    );
    console.log(data);
    setChartData(data);
  }, [gpx]);

  useEffect(() => {
    const { svg, xScale, height, yScale } = getChart(svgRef, gpx, chartData);

    svg.selectAll("*").remove(); // This line removes all child elements of the SVG

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const generateScaledArea = d3
      .area()
      .x((d) => xScale(d.lap))
      .y0(height)
      .y1((d) => yScale(d.elevation))
      .curve(d3.curveCardinal);

    g.append("path")
      .datum(chartData)
      .attr("stroke", token.colorPrimary)
      .attr("stroke-width", 2)
      .attr("fill", token.colorPrimary + "50")
      .attr("d", generateScaledArea);

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => Math.round(d))
      .ticks(Math.min(gpx.laps.length, 50));

    const yAxis = d3.axisLeft(yScale).ticks(7);
    g.append("g").call(xAxis).attr("transform", `translate(0,${height})`);
    g.append("g").call(yAxis);
  }, [chartData, gpx, token.colorPrimary]);

  return <svg ref={svgRef} />;
};

function getChart(
  svgRef: MutableRefObject<undefined>,
  gpx: Gpx,
  chartData: DataPoint[]
) {
  const svg = setupSvg(svgRef);

  // Map each elevation point to its relative position within the total number of points
  const width =
    svg.node()?.getBoundingClientRect().width - margin.left - margin.right;
  const height =
    svg.node()?.getBoundingClientRect().height - margin.top - margin.bottom;

  const xScale = d3
    .scaleLinear()
    .domain([0, gpx.laps.length])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([
      Math.min(
        0,
        d3.min(chartData, (d) => d.elevation)
      ),
      Math.max(
        100,
        d3.max(chartData, (d) => d.elevation)
      ),
    ])
    .range([height, 0]);
  return { svg, xScale, height, yScale };
}
