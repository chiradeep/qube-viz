'use strict';


function connectedNodes(nodes, links) {

	//Create an array logging what is connected to what
	let linkedByIndex = {};

	_.each(nodes.data(), (n, i) => {
		linkedByIndex[i + ',' + i] = 1;
	});

	_.each(links.data(), (l) => {
		linkedByIndex[l.source.index + ',' + l.target.index] = 1;
	});

	//This function looks up whether a pair are neighbours
	function neighboring(a, b) {
		return linkedByIndex[a.index + ',' + b.index];
	}

        function createTip(o) {
                var tip2 = d3.tip()
    	            .attr('class', 'd3-tip-2')
    	            .offset([-10, 0])
    	            .html((d) => d.node.split(".")[0]);
                var svg = d3.select("svg");
                var id = "#" + o.node.split(".")[0];
                var tgt = svg.select(id)[0][0]
                svg.call(tip2)
                tip2.show(o, tgt)
        }

        function removeTips() {
                var svg = d3.select("svg");
                var tips = d3.selectAll(".d3-tip-2").remove()
        }

	return {
		mouseover () {
			const d = d3.select(this).node().__data__;
                        //d3.layout.force().stop


			nodes
				.transition()
				.duration(100)
				.style('opacity', (o) => {
					return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
				});

			links
				.transition()
				.duration(100)
				.style('opacity', function (o) {
					return d.index === o.source.index | d.index === o.target.index ? 1 : 0.1;
				}) 
                                .attr("marker-end", function(o) {
                                    return d.index === o.source.index | d.index === o.target.index ? "url(#end)": "none"});
		},

		mouseout () {
			nodes
				.transition()
				.duration(300)
				.style('opacity', 1);
			links
				.transition()
				.duration(300)
				.style('opacity', 1)
                                .attr("marker-end", "none");
		}
	};
};
