import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface RmsDataPoint {
  timestamp: number; // epoch ms
  rms: number; // 0 to 1
}

interface RmsTimelineChartProps {
  currentRms: number;
  isCallActive: boolean;
}

export const RmsTimelineChart: React.FC<RmsTimelineChartProps> = ({ currentRms, isCallActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dataHistory, setDataHistory] = useState<RmsDataPoint[]>(() => {
    const now = Date.now();
    // Initialize 60 initial points spanning the past 60s
    return Array.from({ length: 30 }, (_, i) => ({
      timestamp: now - (30 - i) * 2000,
      rms: 0.05 + Math.random() * 0.08
    }));
  });

  // Track incoming RMS stream and keep a rolling 60-second window
  useEffect(() => {
    const now = Date.now();
    setDataHistory((prev) => {
      const windowCutoff = now - 60_000; // 60 seconds ago
      const updated = [...prev, { timestamp: now, rms: currentRms }];
      return updated.filter((pt) => pt.timestamp >= windowCutoff);
    });
  }, [currentRms]);

  // Periodic tick to slide time domain smoothly even when rms is static
  useEffect(() => {
    if (!isCallActive) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setDataHistory((prev) => {
        const windowCutoff = now - 60_000;
        return prev.filter((pt) => pt.timestamp >= windowCutoff);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isCallActive]);

  // Render D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 400;
    const height = 54;
    const margin = { top: 4, right: 8, bottom: 14, left: 28 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const now = Date.now();
    const minTime = now - 60_000;

    // X Scale (Time over last 60s)
    const xScale = d3.scaleTime()
      .domain([new Date(minTime), new Date(now)])
      .range([0, innerWidth]);

    // Y Scale (RMS 0.0 to 1.0)
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define Linear Gradient for the Line and Area
    const defs = svg.append('defs');

    const areaGradient = defs.append('linearGradient')
      .attr('id', 'rms-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', currentRms > 0.65 ? '#ef4444' : currentRms > 0.3 ? '#f59e0b' : '#10b981')
      .attr('stop-opacity', 0.45);

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0f172a')
      .attr('stop-opacity', 0.0);

    const lineGradient = defs.append('linearGradient')
      .attr('id', 'rms-line-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    lineGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#0284c7');

    lineGradient.append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#38bdf8');

    lineGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', currentRms > 0.65 ? '#ef4444' : currentRms > 0.3 ? '#f59e0b' : '#34d399');

    // Horizontal Grid Lines
    const yGrid = [0.25, 0.5, 0.75];
    g.selectAll('.grid-line')
      .data(yGrid)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,3')
      .attr('stroke-width', 1);

    // Area Generator
    const areaGenerator = d3.area<RmsDataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerHeight)
      .y1((d) => yScale(d.rms))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const lineGenerator = d3.line<RmsDataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.rms))
      .curve(d3.curveMonotoneX);

    // Draw Area
    if (dataHistory.length > 1) {
      g.append('path')
        .datum(dataHistory)
        .attr('fill', 'url(#rms-area-gradient)')
        .attr('d', areaGenerator);

      // Draw Line
      g.append('path')
        .datum(dataHistory)
        .attr('fill', 'none')
        .attr('stroke', 'url(#rms-line-gradient)')
        .attr('stroke-width', 2)
        .attr('d', lineGenerator);
    }

    // Current live point indicator
    const latestPoint = dataHistory[dataHistory.length - 1];
    if (latestPoint) {
      const cx = xScale(new Date(latestPoint.timestamp));
      const cy = yScale(latestPoint.rms);

      // Outer glow pulse
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 5)
        .attr('fill', currentRms > 0.65 ? '#ef4444' : currentRms > 0.3 ? '#f59e0b' : '#34d399')
        .attr('opacity', 0.4);

      // Inner solid point
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 2.5)
        .attr('fill', '#ffffff');
    }

    // X-Axis Time Ticks (-60s, -30s, 0s Live)
    const timeLabels = [
      { label: '-60s', time: minTime },
      { label: '-30s', time: minTime + 30_000 },
      { label: 'Live', time: now }
    ];

    g.selectAll('.time-label')
      .data(timeLabels)
      .enter()
      .append('text')
      .attr('class', 'time-label')
      .attr('x', (d) => xScale(new Date(d.time)))
      .attr('y', innerHeight + 11)
      .attr('text-anchor', (d, i) => (i === 0 ? 'start' : i === 2 ? 'end' : 'middle'))
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text((d) => d.label);

    // Y-Axis Range Labels (0, 1.0)
    g.append('text')
      .attr('x', -4)
      .attr('y', 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#475569')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('1.0');

    g.append('text')
      .attr('x', -4)
      .attr('y', innerHeight)
      .attr('text-anchor', 'end')
      .attr('fill', '#475569')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('0.0');

  }, [dataHistory, currentRms, isCallActive]);

  return (
    <div id="rms-d3-chart-container" ref={containerRef} className="w-full relative">
      <svg ref={svgRef} className="w-full overflow-visible" />
    </div>
  );
};
