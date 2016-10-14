# qube-viz

Visualize your container / microservices dependencies in a [Kubernetes](https://kubernetes.io) deployment.

## Description

Discovers nodes (sources and destinations of network traffic) and edges (connections between containers and other entities) and uses [D3](https://d3js.org/) [force layout] (https://github.com/d3/d3-3.x-api-reference/blob/master/Force-Layout.md) to draw a graph. You can filter by namespace.

## Theory of Operation
1. Use conntrack to discover connections and endpoints of the connections on each node of the kubernetes deployment. Send this data to a store (redis in this case). Use a daemonset container to deploy this function to every node
2. A web server merges information from the Kubernetes API and the data collected in #1 above, on demand
3. Client-side Javascript fetches the data from #2 and displays graph.

## Requirement

* A running Kubernetes 1.3+ cluster, preferably on AWS.


## Usage
* Deploy redis

``kubectl --namespace=kube-system create -f spec/redis-viz.yaml``

* Deploy collector daemonset

``kubectl --namespace=kube-system create -f spec/qubeviz-collector.yaml``

* Deploy web server

``kubectl --namespace=kube-system create -f spec/qubeviz-server.yaml``

## Sample 
[Static Website](http://qubeviz-demo.s3-website-us-east-1.amazonaws.com)


## Author

[chiradeep](https://github.com/chiradeep)

