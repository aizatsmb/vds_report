// Load both world map + your dataset
Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv("growthrate_coordinates.csv", d => ({
      city: d.City,
      country: d.Country,
      continent: d.Continent,
      pop2024: +d["Population (2024)"],
      pop2023: +d["Population (2023)"],
      growth: +d["Growth Rate"],
      growthPct: +d["Growth Rate (%)"],
      lat: +d.Latitude, 
      lon: +d.Longitude
    }))
  ]).then(([world, data]) => {
  
    // -----------------------------
    // 1. WORLD MAP WITH BUBBLES
    // -----------------------------
    const mapWidth = 800, mapHeight = 450;
  
    const svgMap = d3.select("#map")
      .append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight);
    
    const mapGroup = svgMap.append("g");

    const projection = d3.geoNaturalEarth1()
      .scale(160)
      .translate([mapWidth / 2, mapHeight / 2]);
  
    const path = d3.geoPath().projection(projection);
  
    const countries = topojson.feature(world, world.objects.countries);
  
    mapGroup.append("g")
      .selectAll("path")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#e0e0e0")
      .attr("stroke", "#999");
  
    const bubbleScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => d.pop2024)])
      .range([0, 20]);
  
      mapGroup.append("g")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => projection([d.lon, d.lat])?.[0] || -999)
      .attr("cy", d => projection([d.lon, d.lat])?.[1] || -999)
      .attr("r", d => bubbleScale(d.pop2024))
      .attr("fill", d => d.growth > 0 ? "#4caf50" : "#e53935")
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        highlightCity(d.city);
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${d.city}</strong><br>
            ${d.country}<br>
            Population: ${d.pop2024.toLocaleString()}<br>
            Growth Rate: ${d.growthPct.toFixed(2)}%
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mousemove", event => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", () => {
        clearHighlight();
        tooltip.style("opacity", 0);
      });
      
      const zoom = d3.zoom()
      .scaleExtent([1, 8])   // min and max zoom levels
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
      });
    
    svgMap.call(zoom);

    const legendMap = svgMap.append("g")
  .attr("transform", "translate(20, 470)"); // position in top-left

// Legend items
const legendItems = [
  { label: "Positive Growth", color: "#4caf50" },
  { label: "Negative Growth", color: "#e53935" }
];

// Colored squares
legendMap.selectAll("rect")
  .data(legendItems)
  .enter()
  .append("rect")
  .attr("x", 0)
  .attr("y", (d, i) => i * 22)
  .attr("width", 14)
  .attr("height", 14)
  .attr("fill", d => d.color);

// Labels
legendMap.selectAll("text")
  .data(legendItems)
  .enter()
  .append("text")
  .attr("x", 22)
  .attr("y", (d, i) => i * 22 + 12)
  .style("font-size", "12px")
  .text(d => d.label);

    
    // -----------------------------
    // 2. BAR CHART (Top growth)
    // -----------------------------
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px 10px")
        .style("background", "#333")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);


    const barWidth = 400, barHeight = 450;
  
    const svgBar = d3.select("#bar")
      .append("svg")
      .attr("width", barWidth)
      .attr("height", barHeight);
  
    const topGrowth = data
      .sort((a, b) => d3.descending(a.growth, b.growth))
      .slice(0, 20);
  
    const xBar = d3.scaleLinear()
      .domain([0, d3.max(topGrowth, d => d.growthPct)])
      .range([0, barWidth - 150]);
  
    const yBar = d3.scaleBand()
      .domain(topGrowth.map(d => d.city))
      .range([0, barHeight - 40])
      .padding(0.2);
  
    svgBar.append("g")
      .attr("transform", "translate(140,20)")
      .selectAll("rect")
      .data(topGrowth)
      .enter()
      .append("rect")
      .attr("y", d => yBar(d.city))
      .attr("height", yBar.bandwidth())
      .attr("width", d => xBar(d.growthPct))
      .attr("fill", "#4caf50")
      .on("mouseover", (event, d) => {
        highlightCity(d.city);
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${d.city}</strong><br>
            ${d.country}<br>
            Growth Rate: ${d.growthPct.toFixed(2)}%
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      
      .on("mousemove", event => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", () => {
        clearHighlight();
        tooltip.style("opacity", 0);
      });
      
      // X-axis label (horizontal, below bars)
svgBar.append("text")
  .attr("x", barWidth / 1.5)
  .attr("y", barHeight + 20)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .text("Growth Rate between 2023 - 2024 (%)");

// Y-axis label (vertical, beside city names)
svgBar.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -barHeight / 2)
  .attr("y", 15)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .text("City");

  
    svgBar.append("g")
      .attr("transform", "translate(140,20)")
      .call(d3.axisLeft(yBar));
    
      const xAxis = d3.axisBottom(xBar)
      .ticks(5) // adjust number of ticks
      .tickFormat(d => d); // format as percentage
    
    svgBar.append("g")
      .attr("transform", `translate(140,${barHeight - 15})`) // align with bottom of chart
      .call(xAxis);
    


    // -----------------------------
    // 3. SCATTERPLOT
    // -----------------------------
    const scatterWidth = 800, scatterHeight = 400;
  
    const continentColor = d3.scaleOrdinal()
  .domain([...new Set(data.map(d => d.continent))])
  .range(d3.schemeSet2);

    const svgScatter = d3.select("#scatter")
      .append("svg")
      .attr("width", scatterWidth)
      .attr("height", scatterHeight);
  
    const xScatter = d3.scaleLinear()
      .domain(d3.extent(data, d => d.pop2024))
      .range([60, scatterWidth - 40]);
  
    const yScatter = d3.scaleLinear()
      .domain(d3.extent(data, d => d.growthPct))
      .range([scatterHeight - 40, 40]);
  
    svgScatter.append("g")
      .attr("transform", `translate(0,${scatterHeight - 40})`)
      .call(d3.axisBottom(xScatter).tickFormat(d3.format(".2s")));
  
    svgScatter.append("g")
      .attr("transform", "translate(60,0)")
      .call(d3.axisLeft(yScatter));
      
      const continents = [...new Set(data.map(d => d.continent))];

      const legend = svgScatter.append("g")
        .attr("transform", "translate(750, 40)"); // adjust position as needed
      
      legend.selectAll("rect")
        .data(continents)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 22)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => continentColor(d));
      
      legend.selectAll("text")
        .data(continents)
        .enter()
        .append("text")
        .attr("x", 22)
        .attr("y", (d, i) => i * 22 + 12)
        .style("font-size", "12px")
        .text(d => d);
      
    svgScatter.append("g")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScatter(d.pop2024))
      .attr("cy", d => yScatter(d.growthPct))
      .attr("r", 4)
      .attr("fill", d => continentColor(d.continent))
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        highlightCity(d.city);
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.city}</strong><br>
                 Population: ${d.pop2024.toLocaleString()}<br>
                 Growth Rate: ${d.growthPct.toFixed(2)}%`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mousemove", event => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", () => {
        clearHighlight();
        tooltip.style("opacity", 0);
      });
      
      // X-axis label
svgScatter.append("text")
.attr("x", scatterWidth / 2)
.attr("y", scatterHeight - 5)
.attr("text-anchor", "middle")
.style("font-size", "14px")
.text("Population (2024)");

// Y-axis label
svgScatter.append("text")
.attr("transform", "rotate(-90)")
.attr("x", -scatterHeight / 2)
.attr("y", 15)
.attr("text-anchor", "middle")
.style("font-size", "14px")
.text("Growth Rate (%)");

  
    // -----------------------------
    // 4. SEARCHABLE TABLE
    // -----------------------------
    const table = d3.select("#table").append("table");
const header = table.append("thead").append("tr");

const columns = ["City", "Country", "Continent", "Population (2024)", "Growth Rate (%)"];

header.selectAll("th")
  .data(columns)
  .enter()
  .append("th")
  .text(d => d);

const tbody = table.append("tbody");

// Pagination variables
let currentPage = 1;
const rowsPerPage = 50;
let filteredData = data;

// Render table function
function renderTable() {
  tbody.selectAll("tr").remove();

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  const pageData = filteredData.slice(start, end);

  const rows = tbody.selectAll("tr")
    .data(pageData)
    .enter()
    .append("tr")
    .on("mouseover", (event, d) => highlightCity(d.city))
    .on("mouseout", clearHighlight);

  rows.selectAll("td")
    .data(d => [
      d.city,
      d.country,
      d.continent,
      d.pop2024.toLocaleString(),
      d.growthPct.toFixed(2)
    ])
    .enter()
    .append("td")
    .text(d => d);

  d3.select("#pageInfo").text(`Page ${currentPage} of ${Math.ceil(filteredData.length / rowsPerPage)}`);
}

// Initial render
renderTable();

// Search functionality
d3.select("#tableSearch").on("input", function () {
  const query = this.value.toLowerCase();
  filteredData = data.filter(d => d.city.toLowerCase().includes(query));
  currentPage = 1;
  renderTable();
});

// Pagination buttons
d3.select("#prevPage").on("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

d3.select("#nextPage").on("click", () => {
  if (currentPage < Math.ceil(filteredData.length / rowsPerPage)) {
    currentPage++;
    renderTable();
  }
});

    // -----------------------------
    // HIGHLIGHTING FUNCTION
    // -----------------------------
    function highlightCity(city) {
        d3.selectAll("circle")
          .attr("opacity", d => d.city === city ? 1 : 0.15)
          .attr("stroke", d => d.city === city ? "black" : "none")
          .attr("stroke-width", d => d.city === city ? 2 : 0)
          .attr("r", d => d.city === city ? bubbleScale(d.pop2024) * 1.6 : bubbleScale(d.pop2024));
      
        d3.selectAll("rect")
          .attr("opacity", d => d.city === city ? 1 : 0.3);
      
        d3.selectAll("tr")
          .style("background", d => d?.city === city ? "#ffe082" : "white");
      }
      
      function clearHighlight() {
        d3.selectAll("circle")
          .attr("opacity", 0.7)
          .attr("stroke", "none")
          .attr("stroke-width", 0)
          .attr("r", d => bubbleScale(d.pop2024));
      
        d3.selectAll("rect").attr("opacity", 1);
        d3.selectAll("tr").style("background", "white");
      }
      
  });
  