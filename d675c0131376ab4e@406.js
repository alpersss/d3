import define1 from "./67def5cb48f2f6c4@198.js";

function _1(md){return(
md
)}

function _showOriginalLinks(Inputs){return(
Inputs.toggle({label: "Show original Links"})
)}

function _compatibility_threshold(Inputs){return(
Inputs.range([0, 1], {
  label: "Compatibility threshold",
  value: 0.4
})
)}

function _bundling_stiffness(Inputs){return(
Inputs.range([0, 100], {
  label: "Bundling Stiffness",
  value: 60
})
)}

function _step_size(Inputs){return(
Inputs.range([0, 1], { label: "Step Size", value: 0.2 })
)}

function _chart(d3,width,height,graph,showOriginalLinks,color,edgeBundling,compatibility_threshold,bundling_stiffness,step_size,line,clamp,invalidation)
{
  const svg = d3
      .select(this || d3.create("svg").node()) // to redraw on the previous one
      .attr("viewBox", [0, 0, width, height]),
    gLinks = svg
      .selectAll("g#bundledLinks")
      .data([0]) // create one if doesn't exist
      .join("g")
      .attr("id", "bundledLinks"),
    link = svg
      .selectAll(".link")
      .data(graph.links)
      .join("line")
      .classed("link", true)
      .style("stroke", "firebrick")
      .style("display", showOriginalLinks ? "block" : "none")
      .style("opacity", 0.1),
    node = svg
      .selectAll(".node")
      .data(graph.nodes)
      .join("circle")
      .attr("fill", (d) => color(d.group))
      .attr("r", 3)
      .classed("node", true);
              
  const simulation = d3
    .forceSimulation()
    .nodes(graph.nodes)
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "link",
      d3.forceLink(graph.links).id((d) => d.id)
    )
    .on("tick", tick);

  const drag = d3.drag().on("start", dragstart).on("drag", dragged);

  node.call(drag).on("click", click);

  const bundling = edgeBundling(graph, {
    compatibility_threshold,
    bundling_stiffness,
    step_size
  });

  const bundledPaths = gLinks
    .selectAll("path.bundled")
    .data(graph.links)
    .join("path")
    .attr("class", "bundled")
    .attr("stroke", "#ccc")
    .attr("fill", "none")
    .attr("opacity", 0.7);

  function tick() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node
      .attr("stroke", (d) => (d.fx !== undefined ? "black" : "none"))
      .attr("stroke-width", (d) => (d.fx !== undefined ? 3 : 0))
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    // Draw the force edged results

    bundling.update();
    bundledPaths.data(graph.links).attr("d", (d) => line(d.path));

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  function click(event, d) {
    delete d.fx;
    delete d.fy;
    d3.select(this).classed("fixed", false);
    simulation.alpha(1).restart();
  }

  function dragstart() {
    d3.select(this).classed("fixed", true);
  }

  function dragged(event, d) {
    d.fx = clamp(event.x, 0, width);
    d.fy = clamp(event.y, 0, height);
    simulation.alpha(1).restart();
  }

  // for (let i=0; i< 300; i++)
  //   simulation.tick();
  // simulation.stop();
  simulation.tick();

  invalidation.then(() => simulation.stop());

  return svg.node();
}


function _7(md){return(
md
)}

function _line(d3){return(
d3.line()
  .x(d => d.x)
  .y(d => d.y)
)}

function _color(d3){return(
d3.scaleOrdinal(d3.schemeCategory10)
)}

function _d3(require){return(
require("d3@7")
)}

function _height(width){return(
Math.min(500, width * 0.6)
)}

function _clamp(){return(
function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}
)}

function _graph(miserables){return(
miserables
)}

function _miserables(FileAttachment){return(
FileAttachment("testdata2.json").json()
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["testdata2.json", {url: new URL("./files/83bcb5b31894072705f22b306a4b1e1b4b43e10c4ff270b8a5a9b1931dacb7d8798f648302669c01167cffb393211ae2c6260b2196002abf2047a51185251749.json", import.meta.url), mimeType: "application/json", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable().define(["md"], _1);
  main.variable(observer("viewof showOriginalLinks")).define("viewof showOriginalLinks", ["Inputs"], _showOriginalLinks);
  main.variable().define("showOriginalLinks", ["Generators", "viewof showOriginalLinks"], (G, _) => G.input(_));
  main.variable(observer("viewof compatibility_threshold")).define("viewof compatibility_threshold", ["Inputs"], _compatibility_threshold);
  main.variable().define("compatibility_threshold", ["Generators", "viewof compatibility_threshold"], (G, _) => G.input(_));
  main.variable(observer("viewof bundling_stiffness")).define("viewof bundling_stiffness", ["Inputs"], _bundling_stiffness);
  main.variable().define("bundling_stiffness", ["Generators", "viewof bundling_stiffness"], (G, _) => G.input(_));
  main.variable(observer("viewof step_size")).define("viewof step_size", ["Inputs"], _step_size);
  main.variable().define("step_size", ["Generators", "viewof step_size"], (G, _) => G.input(_));
  main.variable(observer("chart")).define("chart", ["d3","width","height","graph","showOriginalLinks","color","edgeBundling","compatibility_threshold","bundling_stiffness","step_size","line","clamp","invalidation"], _chart);
  main.variable().define(["md"], _7);
  main.variable().define("line", ["d3"], _line);
  main.variable().define("color", ["d3"], _color);
  main.variable().define("d3", ["require"], _d3);
  main.variable().define("height", ["width"], _height);
  main.variable().define("clamp", _clamp);
  main.variable().define("graph", ["miserables"], _graph);
  const child1 = runtime.module(define1);
  main.import("edgeBundling", child1);
  main.variable().define("miserables", ["FileAttachment"], _miserables);
  return main;
}
