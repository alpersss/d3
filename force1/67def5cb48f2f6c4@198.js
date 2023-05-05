function _1(md){return(
md
)}

function _useEdgeBundling(Inputs){return(
Inputs.toggle({
  label: "Use Edge Bundling",
  value: true
})
)}

function _compatibility_threshold(Inputs){return(
Inputs.range([0, 1], {
  label: "Compatibility threshold",
  value: 0.6,
  step: 0.01
})
)}

function _bundling_stiffness(Inputs){return(
Inputs.range([0, 60], {
  label: "Bundling Stiffness",
  value: 0.1,
  step: 0.01
})
)}

function _step_size(Inputs){return(
Inputs.range([0, 1], {
  label: "Step Size",
  value: 0.2,
  step: 0.01
})
)}

function _6(edgeBundling,airlinesGraph,compatibility_threshold,bundling_stiffness,step_size,drawGraph)
{
  // run the edgeBundling, resulting paths stored in airlinesGraph.links[i].path
  const bundling = edgeBundling(airlinesGraph, {
    compatibility_threshold,
    bundling_stiffness,
    step_size
  });
  
  // use bundling.update() to recompute, useful inside the tick function of a forceSimulation

  return drawGraph(airlinesGraph);
}


function _7(edgeBundling,compatibility_threshold,bundling_stiffness,step_size,drawGraph)
{
  const nodes = [
      { id: "a", x: 5, y: 15 },
      { id: "b", x: 17, y: 14 },
      { id: "c", x: 17, y: 15 },
      { id: "d", x: 17, y: 20 }
    ],
    links = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "a", target: "d" },
    ];
  const bundling = edgeBundling(
    { nodes, links },
    {
      compatibility_threshold,
      bundling_stiffness,
      step_size
    }
  );
  // then links will contain the bundles in the path attribute

  return drawGraph({ nodes, links });

  // (Optional) To update the bundling call, useful for force simulations
  bundling.update();
}


function _drawGraph(d3,width,height,useEdgeBundling){return(
function drawGraph({ nodes, links }) {
  const svg = d3
    .create("svg")
    .attr("viewBox", [-10, -10, width + 20, height + 20]);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(nodes, (d) => d.x))
    .range([0, width])
    .nice();
  const y = d3
    .scaleLinear()
    .domain(d3.extent(nodes, (d) => d.y))
    .range([0, height])
    .nice();
  const line = d3
    .line()
    .x((d) => x(d.x))
    .y((d) => y(d.y));

  svg
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => y(d.y))
    .attr("r", 2);

  if (useEdgeBundling) {
    svg
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", (d) => line(d.path))
      .attr("fill", "none")
      .attr("stroke", "#aaa3");
  } else {
    const nodesMap = new Map(nodes.map(d => [d.id, d]))
    svg
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("x1", (d) => x(nodesMap.get(d.source).x))
      .attr("y1", (d) => y(nodesMap.get(d.source).y))
      .attr("x2", (d) => x(nodesMap.get(d.target).x))
      .attr("y2", (d) => y(nodesMap.get(d.target).y))
      .attr("fill", "none")
      .attr("stroke", "#aaa3");
  }

  return svg.node();
}
)}

function _edgeBundling(ForceEdgeBundling){return(
function edgeBundling(
  {
    nodes, // Array of nodes including x and y coords e.g. [{id: "a", x: 10, y:10}, {id: "b", x: 20, y: 20}, ...]
    links // Array of links in D3 forceSimulation format e.g. [{source: "a", target: "b"}, ... ]
  },
  {
    id = (d) => d.id,
    pathAttr = "path", // name of the attribute to save the paths
    bundling_stiffness = 0.1, // global bundling constant controlling edge stiffness
    step_size = 0.1, // init. distance to move points
    subdivision_rate = 2, // subdivision rate increase
    cycles = 6, // number of cycles to perform
    iterations = 90, // init. number of iterations for cycle
    iterations_rate = 0.6666667, // rate at which iteration number decreases i.e. 2/3
    compatibility_threshold = 0.6 //  "which pairs of edges should be considered compatible (default is set to 0.6, 60% compatiblity)"
  } = {}
) {
  // The library wants the links as the index positions in the nodes array
  const dNodes = new Map(nodes.map((d, i) => [id(d), i]));
  const linksIs = links.map((l) => ({
    source: dNodes.get(typeof l.source === "object" ? id(l.source) : l.source),
    target: dNodes.get(typeof l.source === "object" ? id(l.target) : l.target)
  }));

  const edgeBundling = ForceEdgeBundling()
    .nodes(nodes)
    .edges(linksIs)
    .bundling_stiffness(bundling_stiffness)
    .step_size(step_size)
    .subdivision_rate(subdivision_rate)
    .cycles(cycles)
    .iterations(iterations)
    .iterations_rate(iterations_rate)
    .compatibility_threshold(compatibility_threshold);

  edgeBundling.update = () => {
    const paths = edgeBundling();
    links.map((l, i) => (l[pathAttr] = paths[i]));
  };

  edgeBundling.update();

  return edgeBundling;
}
)}

function _ForceEdgeBundling(){return(
function () {
  let data_nodes = {}, // {'nodeid':{'x':,'y':},..}
    data_edges = [], // [{'source':'nodeid1', 'target':'nodeid2'},..]
    compatibility_list_for_edge = [],
    subdivision_points_for_edge = [],
    K = 0.1, // global bundling constant controlling edge stiffness
    S_initial = 0.1, // init. distance to move points
    P_initial = 1, // init. subdivision number
    P_rate = 2, // subdivision rate increase
    C = 6, // number of cycles to perform
    I_initial = 90, // init. number of iterations for cycle
    I_rate = 0.6666667, // rate at which iteration number decreases i.e. 2/3
    compatibility_threshold = 0.6,
    eps = 1e-6,
    P = null;

  /*** Geometry Helper Methods ***/
  function vector_dot_product(p, q) {
    return p.x * q.x + p.y * q.y;
  }

  function edge_as_vector(P) {
    return {
      x: data_nodes[P.target].x - data_nodes[P.source].x,
      y: data_nodes[P.target].y - data_nodes[P.source].y
    };
  }

  function edge_length(e) {
    // handling nodes that are on the same location, so that K/edge_length != Inf
    if (
      Math.abs(data_nodes[e.source].x - data_nodes[e.target].x) < eps &&
      Math.abs(data_nodes[e.source].y - data_nodes[e.target].y) < eps
    ) {
      return eps;
    }

    return Math.sqrt(
      Math.pow(data_nodes[e.source].x - data_nodes[e.target].x, 2) +
        Math.pow(data_nodes[e.source].y - data_nodes[e.target].y, 2)
    );
  }

  function custom_edge_length(e) {
    return Math.sqrt(
      Math.pow(e.source.x - e.target.x, 2) +
        Math.pow(e.source.y - e.target.y, 2)
    );
  }

  function edge_midpoint(e) {
    let middle_x = (data_nodes[e.source].x + data_nodes[e.target].x) / 2.0;
    let middle_y = (data_nodes[e.source].y + data_nodes[e.target].y) / 2.0;

    return {
      x: middle_x,
      y: middle_y
    };
  }

  function compute_divided_edge_length(e_idx) {
    let length = 0;

    for (let i = 1; i < subdivision_points_for_edge[e_idx].length; i++) {
      let segment_length = euclidean_distance(
        subdivision_points_for_edge[e_idx][i],
        subdivision_points_for_edge[e_idx][i - 1]
      );
      length += segment_length;
    }

    return length;
  }

  function euclidean_distance(p, q) {
    return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
  }

  function project_point_on_line(p, Q) {
    let L = Math.sqrt(
      (Q.target.x - Q.source.x) * (Q.target.x - Q.source.x) +
        (Q.target.y - Q.source.y) * (Q.target.y - Q.source.y)
    );
    let r =
      ((Q.source.y - p.y) * (Q.source.y - Q.target.y) -
        (Q.source.x - p.x) * (Q.target.x - Q.source.x)) /
      (L * L);

    return {
      x: Q.source.x + r * (Q.target.x - Q.source.x),
      y: Q.source.y + r * (Q.target.y - Q.source.y)
    };
  }

  /*** ********************** ***/

  /*** Initialization Methods ***/
  function initialize_edge_subdivisions() {
    for (let i = 0; i < data_edges.length; i++) {
      if (P_initial === 1) {
        subdivision_points_for_edge[i] = []; //0 subdivisions
      } else {
        subdivision_points_for_edge[i] = [];
        subdivision_points_for_edge[i].push(data_nodes[data_edges[i].source]);
        subdivision_points_for_edge[i].push(data_nodes[data_edges[i].target]);
      }
    }
  }

  function initialize_compatibility_lists() {
    for (let i = 0; i < data_edges.length; i++) {
      compatibility_list_for_edge[i] = []; //0 compatible edges.
    }
  }

  function filter_self_loops(edgelist) {
    let filtered_edge_list = [];

    for (let e = 0; e < edgelist.length; e++) {
      if (
        data_nodes[edgelist[e].source].x != data_nodes[edgelist[e].target].x ||
        data_nodes[edgelist[e].source].y != data_nodes[edgelist[e].target].y
      ) {
        //or smaller than eps
        filtered_edge_list.push(edgelist[e]);
      }
    }

    return filtered_edge_list;
  }

  /*** ********************** ***/

  /*** Force Calculation Methods ***/
  function apply_spring_force(e_idx, i, kP) {
    let prev = subdivision_points_for_edge[e_idx][i - 1];
    let next = subdivision_points_for_edge[e_idx][i + 1];
    let crnt = subdivision_points_for_edge[e_idx][i];
    let x = prev.x - crnt.x + next.x - crnt.x;
    let y = prev.y - crnt.y + next.y - crnt.y;

    x *= kP;
    y *= kP;

    return {
      x: x,
      y: y
    };
  }

  function apply_electrostatic_force(e_idx, i) {
    let sum_of_forces = {
      x: 0,
      y: 0
    };
    let compatible_edges_list = compatibility_list_for_edge[e_idx];

    for (let oe = 0; oe < compatible_edges_list.length; oe++) {
      let force = {
        x:
          subdivision_points_for_edge[compatible_edges_list[oe]][i].x -
          subdivision_points_for_edge[e_idx][i].x,
        y:
          subdivision_points_for_edge[compatible_edges_list[oe]][i].y -
          subdivision_points_for_edge[e_idx][i].y
      };

      if (Math.abs(force.x) > eps || Math.abs(force.y) > eps) {
        let diff =
          1 /
          Math.pow(
            custom_edge_length({
              source: subdivision_points_for_edge[compatible_edges_list[oe]][i],
              target: subdivision_points_for_edge[e_idx][i]
            }),
            1
          );

        sum_of_forces.x += force.x * diff;
        sum_of_forces.y += force.y * diff;
      }
    }

    return sum_of_forces;
  }

  function apply_resulting_forces_on_subdivision_points(e_idx, P, S) {
    let kP = K / (edge_length(data_edges[e_idx]) * (P + 1)); // kP=K/|P|(number of segments), where |P| is the initial length of edge P.
    // (length * (num of sub division pts - 1))
    let resulting_forces_for_subdivision_points = [
      {
        x: 0,
        y: 0
      }
    ];

    for (let i = 1; i < P + 1; i++) {
      // exclude initial end points of the edge 0 and P+1
      let resulting_force = {
        x: 0,
        y: 0
      };

      let spring_force = apply_spring_force(e_idx, i, kP);
      let electrostatic_force = apply_electrostatic_force(e_idx, i, S);

      resulting_force.x = S * (spring_force.x + electrostatic_force.x);
      resulting_force.y = S * (spring_force.y + electrostatic_force.y);

      resulting_forces_for_subdivision_points.push(resulting_force);
    }

    resulting_forces_for_subdivision_points.push({
      x: 0,
      y: 0
    });

    return resulting_forces_for_subdivision_points;
  }

  /*** ********************** ***/

  /*** Edge Division Calculation Methods ***/
  function update_edge_divisions(P) {
    for (let e_idx = 0; e_idx < data_edges.length; e_idx++) {
      if (P === 1) {
        subdivision_points_for_edge[e_idx].push(
          data_nodes[data_edges[e_idx].source]
        ); // source
        subdivision_points_for_edge[e_idx].push(
          edge_midpoint(data_edges[e_idx])
        ); // mid point
        subdivision_points_for_edge[e_idx].push(
          data_nodes[data_edges[e_idx].target]
        ); // target
      } else {
        let divided_edge_length = compute_divided_edge_length(e_idx);
        let segment_length = divided_edge_length / (P + 1);
        let current_segment_length = segment_length;
        let new_subdivision_points = [];
        new_subdivision_points.push(data_nodes[data_edges[e_idx].source]); //source

        for (let i = 1; i < subdivision_points_for_edge[e_idx].length; i++) {
          let old_segment_length = euclidean_distance(
            subdivision_points_for_edge[e_idx][i],
            subdivision_points_for_edge[e_idx][i - 1]
          );

          while (old_segment_length > current_segment_length) {
            let percent_position = current_segment_length / old_segment_length;
            let new_subdivision_point_x =
              subdivision_points_for_edge[e_idx][i - 1].x;
            let new_subdivision_point_y =
              subdivision_points_for_edge[e_idx][i - 1].y;

            new_subdivision_point_x +=
              percent_position *
              (subdivision_points_for_edge[e_idx][i].x -
                subdivision_points_for_edge[e_idx][i - 1].x);
            new_subdivision_point_y +=
              percent_position *
              (subdivision_points_for_edge[e_idx][i].y -
                subdivision_points_for_edge[e_idx][i - 1].y);
            new_subdivision_points.push({
              x: new_subdivision_point_x,
              y: new_subdivision_point_y
            });

            old_segment_length -= current_segment_length;
            current_segment_length = segment_length;
          }
          current_segment_length -= old_segment_length;
        }
        new_subdivision_points.push(data_nodes[data_edges[e_idx].target]); //target
        subdivision_points_for_edge[e_idx] = new_subdivision_points;
      }
    }
  }

  /*** ********************** ***/

  /*** Edge compatibility measures ***/
  function angle_compatibility(P, Q) {
    return Math.abs(
      vector_dot_product(edge_as_vector(P), edge_as_vector(Q)) /
        (edge_length(P) * edge_length(Q))
    );
  }

  function scale_compatibility(P, Q) {
    let lavg = (edge_length(P) + edge_length(Q)) / 2.0;
    return (
      2.0 /
      (lavg / Math.min(edge_length(P), edge_length(Q)) +
        Math.max(edge_length(P), edge_length(Q)) / lavg)
    );
  }

  function position_compatibility(P, Q) {
    let lavg = (edge_length(P) + edge_length(Q)) / 2.0;
    let midP = {
      x: (data_nodes[P.source].x + data_nodes[P.target].x) / 2.0,
      y: (data_nodes[P.source].y + data_nodes[P.target].y) / 2.0
    };
    let midQ = {
      x: (data_nodes[Q.source].x + data_nodes[Q.target].x) / 2.0,
      y: (data_nodes[Q.source].y + data_nodes[Q.target].y) / 2.0
    };

    return lavg / (lavg + euclidean_distance(midP, midQ));
  }

  function edge_visibility(P, Q) {
    let I0 = project_point_on_line(data_nodes[Q.source], {
      source: data_nodes[P.source],
      target: data_nodes[P.target]
    });
    let I1 = project_point_on_line(data_nodes[Q.target], {
      source: data_nodes[P.source],
      target: data_nodes[P.target]
    }); //send actual edge points positions
    let midI = {
      x: (I0.x + I1.x) / 2.0,
      y: (I0.y + I1.y) / 2.0
    };
    let midP = {
      x: (data_nodes[P.source].x + data_nodes[P.target].x) / 2.0,
      y: (data_nodes[P.source].y + data_nodes[P.target].y) / 2.0
    };

    return Math.max(
      0,
      1 - (2 * euclidean_distance(midP, midI)) / euclidean_distance(I0, I1)
    );
  }

  function visibility_compatibility(P, Q) {
    return Math.min(edge_visibility(P, Q), edge_visibility(Q, P));
  }

  function compatibility_score(P, Q) {
    return (
      angle_compatibility(P, Q) *
      scale_compatibility(P, Q) *
      position_compatibility(P, Q) *
      visibility_compatibility(P, Q)
    );
  }

  function are_compatible(P, Q) {
    return compatibility_score(P, Q) >= compatibility_threshold;
  }

  function compute_compatibility_lists() {
    for (let e = 0; e < data_edges.length - 1; e++) {
      for (let oe = e + 1; oe < data_edges.length; oe++) {
        // don't want any duplicates
        if (are_compatible(data_edges[e], data_edges[oe])) {
          compatibility_list_for_edge[e].push(oe);
          compatibility_list_for_edge[oe].push(e);
        }
      }
    }
  }

  /*** ************************ ***/

  /*** Main Bundling Loop Methods ***/
  let forcebundle = function () {
    let S = S_initial;
    let I = I_initial;
    let P = P_initial;

    initialize_edge_subdivisions();
    initialize_compatibility_lists();
    update_edge_divisions(P);
    compute_compatibility_lists();

    for (let cycle = 0; cycle < C; cycle++) {
      for (let iteration = 0; iteration < I; iteration++) {
        let forces = [];
        for (let edge = 0; edge < data_edges.length; edge++) {
          forces[edge] = apply_resulting_forces_on_subdivision_points(
            edge,
            P,
            S
          );
        }
        for (let e = 0; e < data_edges.length; e++) {
          for (let i = 0; i < P + 1; i++) {
            subdivision_points_for_edge[e][i].x += forces[e][i].x;
            subdivision_points_for_edge[e][i].y += forces[e][i].y;
          }
        }
      }
      // prepare for next cycle
      S = S / 2;
      P = P * P_rate;
      I = I_rate * I;

      update_edge_divisions(P);
      //console.log('C' + cycle);
      //console.log('P' + P);
      //console.log('S' + S);
    }
    return subdivision_points_for_edge;
  };
  /*** ************************ ***/

  /*** Getters/Setters Methods ***/
  forcebundle.nodes = function (nl) {
    if (arguments.length === 0) {
      return data_nodes;
    } else {
      data_nodes = nl;
    }

    return forcebundle;
  };

  forcebundle.edges = function (ll) {
    if (arguments.length === 0) {
      return data_edges;
    } else {
      data_edges = filter_self_loops(ll); //remove edges to from to the same point
    }

    return forcebundle;
  };

  forcebundle.bundling_stiffness = function (k) {
    if (arguments.length === 0) {
      return K;
    } else {
      K = k;
    }

    return forcebundle;
  };

  forcebundle.step_size = function (step) {
    if (arguments.length === 0) {
      return S_initial;
    } else {
      S_initial = step;
    }

    return forcebundle;
  };

  forcebundle.cycles = function (c) {
    if (arguments.length === 0) {
      return C;
    } else {
      C = c;
    }

    return forcebundle;
  };

  forcebundle.iterations = function (i) {
    if (arguments.length === 0) {
      return I_initial;
    } else {
      I_initial = i;
    }

    return forcebundle;
  };

  forcebundle.iterations_rate = function (i) {
    if (arguments.length === 0) {
      return I_rate;
    } else {
      I_rate = i;
    }

    return forcebundle;
  };

  forcebundle.subdivision_points_seed = function (p) {
    if (arguments.length == 0) {
      return P;
    } else {
      P = p;
    }

    return forcebundle;
  };

  forcebundle.subdivision_rate = function (r) {
    if (arguments.length === 0) {
      return P_rate;
    } else {
      P_rate = r;
    }

    return forcebundle;
  };

  forcebundle.compatibility_threshold = function (t) {
    if (arguments.length === 0) {
      return compatibility_threshold;
    } else {
      compatibility_threshold = t;
    }

    return forcebundle;
  };

  /*** ************************ ***/

  return forcebundle;
}
)}

function _height(){return(
500
)}

function _airlinesGraph(FileAttachment){return(
FileAttachment("airlines@1.json").json()
)}

function _13(md){return(
md
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["airlines@1.json", {url: new URL("./files/8c4c24c2789793540bd1c9dd52996cd55fc1e1916bd1c9f8fcc460594e8e8e7ca2552954b00aa48ceb724f8bdb4cf14257c9f7fdcb5470ee43470f17dce7a0c3.json", import.meta.url), mimeType: "application/json", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("viewof useEdgeBundling")).define("viewof useEdgeBundling", ["Inputs"], _useEdgeBundling);
  main.variable(observer("useEdgeBundling")).define("useEdgeBundling", ["Generators", "viewof useEdgeBundling"], (G, _) => G.input(_));
  main.variable(observer("viewof compatibility_threshold")).define("viewof compatibility_threshold", ["Inputs"], _compatibility_threshold);
  main.variable(observer("compatibility_threshold")).define("compatibility_threshold", ["Generators", "viewof compatibility_threshold"], (G, _) => G.input(_));
  main.variable(observer("viewof bundling_stiffness")).define("viewof bundling_stiffness", ["Inputs"], _bundling_stiffness);
  main.variable(observer("bundling_stiffness")).define("bundling_stiffness", ["Generators", "viewof bundling_stiffness"], (G, _) => G.input(_));
  main.variable(observer("viewof step_size")).define("viewof step_size", ["Inputs"], _step_size);
  main.variable(observer("step_size")).define("step_size", ["Generators", "viewof step_size"], (G, _) => G.input(_));
  main.variable(observer()).define(["edgeBundling","airlinesGraph","compatibility_threshold","bundling_stiffness","step_size","drawGraph"], _6);
  main.variable(observer()).define(["edgeBundling","compatibility_threshold","bundling_stiffness","step_size","drawGraph"], _7);
  main.variable(observer("drawGraph")).define("drawGraph", ["d3","width","height","useEdgeBundling"], _drawGraph);
  main.variable(observer("edgeBundling")).define("edgeBundling", ["ForceEdgeBundling"], _edgeBundling);
  main.variable(observer("ForceEdgeBundling")).define("ForceEdgeBundling", _ForceEdgeBundling);
  main.variable(observer("height")).define("height", _height);
  main.variable(observer("airlinesGraph")).define("airlinesGraph", ["FileAttachment"], _airlinesGraph);
  main.variable(observer()).define(["md"], _13);
  return main;
}
