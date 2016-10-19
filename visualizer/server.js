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

const express = require('express');
const PORT = 80
var app = express();
var path = require('path');

var graph = require('./graphserver.js')

app.use('/lib', express.static('lib'));
app.use('/node_modules', express.static('node_modules'));
app.use('/graph.js', express.static('graph.js'));
app.use('/graph.css', express.static('graph.css'));
app.get('/', function(req, res) {
     console.log("got here")
     res.sendFile(path.join(__dirname + '/index.html'));
});
app.get('/graph', function(req, res) {
     console.log("asking for graph json");
     console.log("url", req.originalUrl);
     res.contentType('application/json');
     graph.getGraph(function(graph) {
         console.log("**graph****: ", graph);
         res.json(graph);
     });
});

app.listen(PORT);
console.log('Running on ' + PORT);

