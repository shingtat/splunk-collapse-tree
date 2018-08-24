define([
            'jquery',
            'underscore',
            'api/SplunkVisualizationBase',
            'api/SplunkVisualizationUtils',
            'd3',
            'd3-hierarchy'
        ],
        function(
            $,
            _,
            SplunkVisualizationBase,
            vizUtils,
            d3,
            d3Hierarchy
        ) {

    var margin = {top: 20, right: 120, bottom: 20, left: 120};
    var width;
    var height;
    var i = 0;
    var duration = 750;

    //service level categorizations for legend
    var legendLevels = [
      {"Category": "Red"},
      {"Category": "Amber"},
      {"Category": "Green"}
    ];

    //add tooltip div
    var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

    //collapses all nodes in the beginning
    function collapse(d){
      if(d.children){
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    //recursive search to find for the specific event you want to find.
    function search(node, id){
      if(node==null) return;
      else if(node.id.toUpperCase().replace(/_/g, "") == id) return node;
      var childrens = node._children || node.children || 0;
      var toReturn;
      for(var i = 0; i<childrens.length; i++){
        var result = search(childrens[i], id);
        if(result!=null) toReturn = result;
      }
      return toReturn;
    }

    return SplunkVisualizationBase.extend({

        initialize: function() {
            this.$el = $(this.el);
            this.$el.addClass('splunk-collapse-tree');
        },

        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: 10000
            });
        },

        formatData: function(data, config) {

            //sets configuration parameters
            this._getConfigParams(config);

            width = this.width - margin.right - margin.left;
            height = (this.height - margin.top - margin.bottom) || 0;

            // Check empty data
            if(data.rows.length < 1) {
                return false;
            }

            //Map that keeps track of the event keys and their corresponding dependency.
            var map = {};

            //Map that keeps track of duplicates. If duplicate event found, add ":" and unique counter to "DependsOnEventKey" variable
            //This is necessary to ensure that every event has a unique id even if they have multiple parents
            //e.g. if EODTOK has parents EODHKTOK and HVACLATE
            var countDuplicatesMap = {};

            var treeData = _.map(data.rows, function(row, i){

              var DependsEventServiceLevelCode = row[0];
              var DependsEventServiceLevelSetName = row[1];
              var DependsExpectedDateTime = row[2];
              var DependsOnEventDescription = row[3];
              var DependsOnEventKey = row[4];
              var DependsUpdateTime = row[5];
              var EventKey = row[6];

              map[DependsOnEventKey] = EventKey;
              if(map[EventKey]==null){
              	map[EventKey] = "";
              }

              if(countDuplicatesMap[DependsOnEventKey]==null){
              	countDuplicatesMap[DependsOnEventKey] = EventKey;
              	return {
                  "name": DependsOnEventKey,
                  "parent": EventKey,
                  "expectDateTime": DependsExpectedDateTime,
                  "updateDateTime": DependsUpdateTime,
                  "serviceLevelCode": DependsEventServiceLevelCode,
                  "serviceLevelName": DependsEventServiceLevelSetName
                };
              }
              else{
              	return {
                  "name": DependsOnEventKey+":"+i,
                  "parent": EventKey,
                  "expectDateTime": DependsExpectedDateTime,
                  "updateDateTime": DependsUpdateTime,
                  "serviceLevelCode": DependsEventServiceLevelCode,
                  "serviceLevelName": DependsEventServiceLevelSetName
                };
              }
            });

            //Ensures that all top level nodes resolve back to a single parent called "Reports"
            for(var key in map){
              if(map[key]=="") treeData.push({"name": key, "parent": "Reports"});
            }
            //Tells the tree that Reports does not have another parent
            treeData.push({"name": "Reports", parent: ""});

            //Changes treeData into tree format
            var root = d3Hierarchy.stratify()
                .id(function(d){ return d.name; })
                .parentId(function(d){ return d.parent; })
                (treeData);

            root.children.forEach(collapse);
            root.x0 = height/2;
            root.y0 = 0;

            console.log("event: " + this.event);
            console.log("apac: " + this.apac);
            console.log("eu: " + this.eu);
            console.log("us: " + this.us);

            //default searches when page initially loads
            //the following variables are dynamic and changes whenever the search input changes in the front end in format section
            //can be set in savedsearches.conf and savedsearches.conf.spec
            if(this.event!="") toSearch = this.event;
            else if(this.apac!="None") toSearch = this.apac;
            else if(this.eu!="None") toSearch = this.eu;
            else if(this.us!="None") toSearch = this.us;
            else toSearch = "Reports";
            console.log("toSearch: " + toSearch);
            //standardize search so it is case insensitive and doesn't compare underscore
            var target = search(root, toSearch.toUpperCase().replace(/_/g, ""));
            console.log(target);
            if(!target){
              throw new SplunkVisualizationBase.VisualizationError(
                  'Event ' + '\'' + toSearch + '\' ' + 'not found in the dataset. ' + '\n' + 'Please search again.'
              );
            }
            return target;
        },
        //gets called automatically when data changes
        updateView: function(data, config) {

          if (!data) {
              return;
          }

          this.$el.empty();

          this.useDrilldown = this._isEnabledDrilldown(config);

          this.drawTree(data);

          //Add Legend
          var legend = d3.select(this.el).append('div')
                  .attr('class', 'legend')
                  .append('ul');

          var keys = legend.selectAll('li.key')
                  .data(legendLevels);

          var that = this;

          keys.enter().append('li')
                  .attr('class', 'key')
                  .style('border-left-color', function(d) {
                    if(d.Category == "Red") return that.red;
                    else if(d.Category == "Amber") return that.amber
                    else if(d.Category == "Green") return that.green
                  })
                  .append('span')
                  .text(function(d) {
                    return d.Category + " Service Level";
                  });
        },

        drawTree: function(source){
          var that = this;
          var tree = d3.layout.tree()
              .size([height, width]);

          var diagonal = d3.svg.diagonal()
              .projection(function(d) { return [d.y, d.x]; });

          var svg = d3.select(this.el).append("svg")
              .attr("width", width + margin.right + margin.left)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var nodes = tree.nodes(source).reverse();
          var links = tree.links(nodes);

          //becareful of using "this", whenever you use forEach, this refers to the current iterating element.
          //that.length set dynamically, front end has input box.
          nodes.forEach(function(d) { d.y = d.depth * that.length; });

          var node = svg.selectAll("g.node")
              .data(nodes, function(d) { return d.id || (d.id = ++i); });

          var nodeEnter = node.enter().append("g")
              .attr("class", "node")
              .attr("transform", function(d){ return "translate(" + source.y0 + "," + source.x0 + ")";})
              .on("click", function(d){
                if(d.data.name!="Reports" && (d.children!=null || d._children!=null)){
                  if(d.children){
                    d._children = d.children;
                    d.children = null;
                  }
                  else{
                    d.children = d._children;
                    d._children = null;
                  }
                  //hides the div again
                  div.transition().duration(300).style("opacity", 1e-6);
                  that.invalidateUpdateView();
                }
              })
              .on("mouseover", function(d){
                div.transition().duration(300).style("opacity", 1);
                div.text(
                "Due: " + (!d.data.expectDateTime ? "Not Specified" : d.data.expectDateTime) +
                "\n" + "Service: " + (!d.data.serviceLevelName ? "Not Specified" : d.data.serviceLevelName) +
                "\n" + "Updated: " + (!d.data.updateDateTime ? "Not Specified" : d.data.updateDateTime)
                )
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY) + "px");
              })
              .on("mouseout", function(){
                div.transition().duration(300).style("opacity", 1e-6);
              });


          nodeEnter.append("circle")
              .attr("r", 1e-6)
              .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff";})
              .style("stroke", function(d){
                //if by default database already provides a service level code and is not null, use that
                 if(d.data.serviceLevelCode){
                   if(d.data.serviceLevelCode.trim() == "Red") return that.red;
                   else if(d.data.serviceLevelCode.trim() == "Amber") return that.amber;
                   else if(d.data.serviceLevelCode.trim() == "Green") return that.green;
                 }
                 //if database does not provide a service level code and it is not a leaf node, take the color of the
                 //most critical child
                 else if(d._children){
                   var redCounter = 0;
                   var amberCounter = 0;
                   var greenCounter = 0;
                   d._children.forEach(function(child){
                     if(child.data.serviceLevelCode.trim() == "Red") redCounter++;
                     else if(child.data.serviceLevelCode.trim() == "Amber") amberCounter++;
                     else if(child.data.serviceLevelCode.trim() == "Green") greenCounter++;
                   })
                   if(redCounter > 0) return that.red;
                   else if(amberCounter > 0) return that.amber;
                   else if(greenCounter > 0) return that.green;
                 }
              });

          nodeEnter.append("text")
              .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
              .attr("dy", ".35em")
              .attr("text-anchor", function(d){ return d.children || d._children ? "end" : "start"; })
              .text(function(d){return d.data.name.split(":")[0];})
              .style("fill-opacity", 1e-6);

          var nodeUpdate = node.transition()
              .duration(duration)
              .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

          nodeUpdate.select("circle")
              .attr("r", this.radius)
              .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

          nodeUpdate.select("text")
              .style("fill-opacity", 1);

          //Transition exiting nodes to the parent's new position.
          var nodeExit = node.exit().transition()
              .duration(duration)
              .attr("transform", function(d){ return "translate(" + source.y + "," + source.x + ")"; })
              .remove();

          nodeExit.select("circle")
              .attr("r", 1e-6);

          nodeExit.select("text")
              .style("fill-opacity", 1e-6);

          //Update the links...
          var link = svg.selectAll("path.link")
              .data(links, function(d) { return d.target.id; });

          //Enter any new links at the parent's previous position
          link.enter().insert("path", "g")
              .attr("class", "link")
              .attr("d", function(d){
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
              });

          //Transition links to their new position.
          link.transition()
              .duration(duration)
              .attr("d", diagonal);

          //Transition exiting nodes to the parent's new position.
          link.exit().transition()
              .duration(duration)
              .attr("d", function(d){
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
              })
              .remove();

          //Stash the old positions for transition.
          nodes.forEach(function(d){
            d.x0 = d.x;
            d.y0 = d.y;
          });
        },

        _drilldown: function() {
            var data = this.getCurrentData();

            var payload = {
                action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
                data: {}
            };
            payload.data[data.field] = data.datum;
            this.drilldown(payload);
        },

        _isEnabledDrilldown: function(config) {
            if (config['display.visualizations.custom.drilldown'] && config['display.visualizations.custom.drilldown'] === 'all') {
                return true;
            }
            return false;
        },

        reflow: function(){
            this.invalidateUpdateView();
        },

        _getEscapedProperty: function(name, config) {
            var propertyValue = config[this.getPropertyNamespaceInfo().propertyNamespace + name];
            return vizUtils.escapeHtml(propertyValue);
        },

        _getConfigParams: function(config) {
            this.length = this._getEscapedProperty('length', config) || 180;
            this.radius = this._getEscapedProperty('radius', config) || 4.5;
            this.width = this._getEscapedProperty('width', config) || 1200;
            this.height = this._getEscapedProperty('height', config) || 500;

            this.event = this._getEscapedProperty('event', config) || "";
            this.apac = this._getEscapedProperty('apac', config) || "None";
            this.eu = this._getEscapedProperty('eu', config) || "None";
            this.us = this._getEscapedProperty('us', config) || "None";

            this.red = this._getEscapedProperty('red', config) || "#ff0000";
            this.amber = this._getEscapedProperty('amber', config) || "#FFA500";
            this.green = this._getEscapedProperty('green', config) || "#008000";
        }
    });
});
