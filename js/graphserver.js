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
 */


/*jslint es6 */
"use strict";

const redis = require("redis");
const K8s = require('k8s');


var redisHost = "redis-viz";
if (process.env.GET_HOSTS_FROM == "env") {
   redisHost = process.env.REDIS_VIZ_SERVICE_HOST;
}
console.log("redis host is " + redisHost);
var redisClient = redis.createClient({port:6379, host:redisHost});

var kubeApiServer = "localhost";
var scheme = "http://";
var kubeApiServerPort = 8080;


var kubeApiEndpoint =  scheme + kubeApiServer + ':' + kubeApiServerPort;
console.log('Kubernetes API Endpoint:', kubeApiEndpoint);

var kubeapi = K8s.api({
               endpoint: kubeApiEndpoint
              , version: '/api/v1'
              });

function expireRedisData() {
    redisClient.del("ips", function(err, reply){console.log("Deleted ", reply, "ips")});
    redisClient.del("edges", function(err, reply){console.log("Deleted ", reply, "edges")});
}

function excludeNode(nodeName, nodeIp){
    return nodeName.startsWith("kubeviz") || nodeName.startsWith("redis-viz") || nodeName.startsWith("kubeviz");
}



function getPods(podData, graph){
    console.log("In getPods");
    podData.items.forEach(function(item) {
        console.log("kube-pod", item.status.podIP);
        var itemName = item.metadata.name.split(".")[0];
        if (!excludeNode(itemName, item.status.podIP)) {
            if (item.status.podIP) {
                graph.nodeips[item.status.podIP] = itemName;
                graph.nodes.push({"node": itemName,
                    "ip": item.status.podIP,
                    "namespace" : item.metadata.namespace,
                    "type" : "pod",
                    "size" : 1,
                    "outgoing": 0,
                    "incoming" : 0});
            }
        }
    });
    return graph;
}

function getSvcs(svcData, graph){
    console.log("In getSvcs");
    svcData.items.forEach(function(item) {
        console.log("kube-svc", item.spec.clusterIP);
        var itemName = item.metadata.name.split(".")[0];
        if (!excludeNode(itemName, item.spec.clusterIP)) {
            graph.nodeips[item.spec.clusterIP] = itemName;
            graph.nodes.push({ "node" : itemName,
                  "ip": item.spec.clusterIP,
                  "namespace" : item.metadata.namespace,
                  "type" : "svc",
                  "size" : 1,
                  "outgoing": 0,
                  "incoming" : 0});
        }
   });
   return graph;
}

function mapK8sNodes(graph){
    console.log("In mapK8sNodes");
    return kubeapi.get('/pods')
              .then(function(data) {
                   return getPods(data, graph);
               })
              .then(function(graph) {
                   return kubeapi.get('/services')
                             .then(function(data){ 
                                 return getSvcs(data, graph);
                              })
               });
}

function getGroupNames(graph) {
    console.log("In getGroupNames");
    var names = [];
    return kubeapi.get('/namespaces')
               .then(function(data) { 
                    data.items.forEach(function(item) { 
                        names.push(item.metadata.name);
                    });
                   graph.groups = names;
                   return graph;
                });
}


exports.getGraph =
function getGraph(callback) {

    var graph = {};

    graph.nodes = [];
    graph.edges = [];
    graph.nodeips = {};
    graph.groups = [];
    console.log("In getGraph");


    getGroupNames(graph).
        then(function(graph) {
             mapK8sNodes(graph)
                .then(function(graph) {
                      redisClient.smembers("ips", function(err, reply) {
                          //build a list of all nodes
                          reply.forEach(function(ipaddr) {
                              (function(ipaddr) {
                                  if (!graph.nodeips[ipaddr]){ //non-kube IPs
                                      graph.nodes.push({"node": ipaddr, "type": "external", 
                                                  "ip": ipaddr, "namespace" : "external", 
                                                  "size":1, "incoming":0, "outgoing":0}
                                                );
                                      graph.nodeips[ipaddr] = ipaddr;
                                  }
                              })(ipaddr)
                           });
                      
                           //figure out edges for each ip
                           redisClient.smembers("edges", function(err, reply) {
                               graph.edges = reply;
                               console.log ("Graph:", graph)
                               callback(graph)
                           });
              
                      });
                });
  });
}

/* TODO: do this in a watch against pods and services*/
setInterval(expireRedisData, 300000);
