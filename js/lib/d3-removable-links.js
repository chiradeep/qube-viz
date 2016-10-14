'use strict';


function removableLinks() {
	return function(e) {
		d3.event.preventDefault();

		this.remove();
	};
};
