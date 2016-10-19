/*
 * Copyright 2016 Citrix Systems, Inc
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *     
 */

var colorMap = {
    'pod': '#1abc9c',
    'elb': '#3498db',
    'svc': '#9b59b6',
    'kube-proxy': '#e67e22',
    'cluster-local': '#34495e',
    'external': '#f1c40f',
    'kube-system': '993300'
        //'#e67e22',
        //'#e74c3c',
        //'#bdc3c7',
        //'#7f8c8d',
        //'#16a085'
};

function isRFC1918Addr(addr) {
    //FIXME
    return addr.startsWith("172.") || addr.startsWith("192.168.") || addr.startsWith("10.");
}

function pickColor(d) {
    if (d.node.startsWith("kube-proxy")) {
        return colorMap['kube-proxy'];
    }
    if (d.type == "external" && isRFC1918Addr(d.ip)) {
        return colorMap['cluster-local'];
    }
    if (d.namespace == "kube-system") {
        return colorMap['kube-system'];
    }
    return colorMap[d.type];
};

function rdius(d) {
    return Math.sqrt(d.size) * 3.5;
};

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");


const fisheyeD3 = fisheye(d3);

const collide = collideFactory(fisheyeD3);
svg = fisheyeD3.select('svg');

function drawGraph(graph) {
    //console.log(graph);
    var f = fisheyeD3.layout.force();
    fisheye = fisheyeD3.fisheye
        .circular()
        .radius(230)
        .distortion(2);

    var linkDist = graph.nodes.length / 3;
    var charge = -200 * graph.nodes.length / 8;
    console.log("Link distance factor is", linkDist);
    var force = f.size([width, height])
        .nodes(graph.nodes)
        .links(graph.edges)
        .charge(charge)
        .gravity(0.1)
        .on('tick', onTick)
        .linkDistance((d) => width / linkDist);

    //this is for the tooltip (nodename) when hovering over the node
    var tip = fisheyeD3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html((d) => d.node);

    //this is for the arrow tip for the link
    svg.append("svg:defs").selectAll("marker")
        .data(["end"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    svg.call(tip);

    svg.on('mousemove', () => {
        force.stop();
        fisheye.focus(fisheyeD3.mouse(this.svg[0][0]));

        nodes
            .each(d => {
                d.fisheye = fisheye(d);
            })
            .attr('cx', d => d.fisheye.x)
            .attr('cy', d => d.fisheye.y)
            .attr('r', rdius);

        links
            .attr('x1', d => d.source.fisheye.x)
            .attr('y1', d => d.source.fisheye.y)
            .attr('x2', d => d.target.fisheye.x)
            .attr('y2', d => d.target.fisheye.y);
    });

    svg.on('mouseout', () => {
        force.resume();

        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes
            .attr('cx', (d) => d.x)
            .attr('cy', (d) => d.y)
            .attr('r', rdius);
    });

    var links = svg.selectAll('.link')
        .data(graph.edges)
        .enter()
        .append('line')
        .attr('class', 'link');

    var nodes = svg.selectAll('.nodes')
        .data(graph.nodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('id', (d) => d.node)
        .attr('r', rdius)
        .style('fill', pickColor)
        .call(pinNodes(fisheyeD3, f, onTick));

    force.start();
    console.log("started");

    function onTick() {

        console.log("tick");
        links.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes.attr('cx', function(d) {
                return d.x;
            })
            .attr('cy', function(d) {
                return d.y;
            })
            .each(collide(0.3, graph.nodes));


    };
    const {
        mouseover,
        mouseout
    } = connectedNodes(nodes, links);
    const removableNs = removableNodes(nodes, links);
    const removableLs = removableLinks();
    const {
        expand,
        shrink
    } = linkExpander();

    nodes.on('mouseover.connection', mouseover)
        .on('mouseout.connection', mouseout)
        .on('mouseover.tooltip', tip.show)
        .on('mouseout.tooltip', tip.hide)
        .on('dblclick', removableNs);

    links.on('dblclick', removableLs)
        .on('mouseover', expand)
        .on('mouseout', shrink);

}

function isRFC1918Addr(addr) {
    //FIXME
    return addr.startsWith("172.") || addr.startsWith("192.168.") || addr.startsWith("10.");
}

function initialLayout(nodes) {
    var externalNodes = nodes.filter(function(node) {
        return node.type == "external";
    });
    var numExternal = externalNodes.length;
    console.log("Number of external nodes", numExternal);
    const yrange = 600;
    var split = yrange / (numExternal + 1);
    var y = split;
    //try to lay them out equally spaced, vertically
    nodes.forEach(function(node, index, arr) {
        if (node.type == "external") {
            node.x = 80;
            node.y = y;
            y = y + split;
            node.fixed = true;
        }
    });
    return nodes;
}

function incrNodeSize(nodes, nodename, direction) {
    nodes.forEach(function(node) {
        if (node.node == nodename) {
            node.size += 1;
            if (direction == "outgoing") {
                node.outgoing += 1;
            }
            if (direction == "incoming") {
                node.incoming += 1;
            }
        }
    });
}

function findNodeIndex(nodes, nodename) {
    return nodes.findIndex(function(node) {
        return (node.node == nodename);
    });
}

function findNodeByIp(nodes, ip) {
    return nodes.find(function(node) {
        return (node.ip == ip);
    });
}

function excludeEdge(nodes, srcIp, dstIp, includeEgress, groups) {
    var src = findNodeByIp(nodes, srcIp);
    var dst = findNodeByIp(nodes, dstIp);
    if (!src || !dst) {
        return true;
    }
    if (src.node.startsWith("kube-proxy") && dst.node.startsWith("kube-proxy")) {
        return true;
    }
    if (src.node.startsWith("kube-proxy") && groups.indexOf(dst.namespace) == -1) {
        return true;
    }

    if (dst.node.startsWith("kube-proxy") && groups.indexOf(src.namespace) == -1) {
        return (src.namespace != "external");
    }
    if (!isRFC1918Addr(srcIp) && !includeEgress) {
        return true;
    }
    return false;
}




function filterGraph(graph, groups, includeEgress) {
    var nodes = graph.nodes;
    var ipEdges = graph.edges;
    var ipToNodeName = graph.nodeips;
    var outLinksForIp = {};
    var inLinksForIp = {};
    var edges = [];
    var graphOutput = {};

    for (var ip in ipToNodeName) {
        outLinksForIp[ip] = [];
        inLinksForIp[ip] = [];
    }
    console.log("Filtering: #nodes,#edges=", nodes.length, ipEdges.length, groups, includeEgress);
    //console.log("Filtering", graph, groups, includeEgress);
    ipEdges.forEach(function(e) {
        var edge = e.split(",");
        var src = edge[0];
        var dst = edge[1];
        //console.log(edge);
        if (ipToNodeName[src] && ipToNodeName[dst]) {
            outLinksForIp[src].push(dst);
            inLinksForIp[dst].push(src);
        }
    });
    //filter out nodes that are not required
    //e.g., not in the desired namespace
    var filteredNodes = nodes.filter(function(node) {
        if (!includeEgress && node.type == "external") {
            return false;
        }
        if (groups.indexOf(node.namespace) != -1) {
            return true;
        }
        if (node.node.startsWith("kube-proxy")) {
            return true;
        }
        return false;
    });
    console.log("filteredNodes", filteredNodes);
    //if node connects to required node, include it even if not in
    //desired namespace. Note that this might lead to extraneous edges
    //to /from kube-proxy
    //to avoid duplicates, use a dictionary instead of a list.
    //later we'll extract a list from the dictionary
    var finalNodes = {};
    filteredNodes.forEach(function(fn) {
        var ip = fn.ip;
        //console.log("fn.ip", ip);
        var outlinks = outLinksForIp[ip];
        var inlinks = inLinksForIp[ip];
        finalNodes[ip] = fn;
        if (includeEgress) {
            for (var o in outlinks) {
                var outip = outlinks[o];
                var node = findNodeByIp(nodes, outip);
                finalNodes[outip] = node;
            }
        }
        for (var i in inlinks) {
            var inip = inlinks[i];
            if (!includeEgress && !isRFC1918Addr(inip)) {
                console.log("Skipping external ip", inip);
            } else {
                var node = findNodeByIp(nodes, inip);
                finalNodes[inip] = node;
            }
        }
    });
    console.log("finalNodes", finalNodes);
    //extract node array from dict
    nodes.length = 0 //clear it
    for (var ip in finalNodes) {
        nodes.push(finalNodes[ip]);
    };
    //console.log("Nodes", nodes);

    //sort by incoming links
    nodes = nodes.sort(function(left, right) {
        return left.incoming - right.incoming;
    });
    ipEdges.forEach(function(e) {
        var edge = e.split(",");
        var src = edge[0];
        var dst = edge[1];
        //console.log("Edge: ", edge);
        if (ipToNodeName[src] && ipToNodeName[dst]) {
            //console.log("Edge2: ", edge);
            var srcIndex = findNodeIndex(nodes, ipToNodeName[src]);
            var dstIndex = findNodeIndex(nodes, ipToNodeName[dst]);
            if (srcIndex >= 0 && dstIndex >= 0) {
                //console.log("Edge3: ", edge);
                incrNodeSize(nodes, ipToNodeName[src], "outgoing");
                incrNodeSize(nodes, ipToNodeName[dst], "incoming");
                if (!excludeEdge(nodes, src, dst, includeEgress, groups)) {
                    edges.push({
                        "source": Number(srcIndex),
                        "target": Number(dstIndex)
                    })
                    console.log("Push Edge: ", edge);
                }
            }
        }
    });
    graphOutput.nodes = initialLayout(nodes);
    graphOutput.edges = edges;

    return graphOutput;
}
