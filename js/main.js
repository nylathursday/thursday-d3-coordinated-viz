/* javascript by Nyla Thursday, 2022*/
/* Map of Wisconsin 2022 County Health factors */
/* Future development: expand to include all ranked features in yearly report. Use this JS as base template */

/* Current itteration not fully working for the following:
- .counties not recognized in style.css
- mouseover counties does not highlight county with outline
- counties do not recolor but there is no error.
    Break seems to occur in function change Attribute .style line. (312)
*/

(function(){

    //pseudo-global variables
    var attrArray = ["Median Household Income", "Percent Food Insecure", "Percent Childcare Cost Burden", "Percent Severe Houseing Cost Burden", "Percent Children in Poverty"]; //variables for data join
    var expressed = attrArray[0]; //initial attribute
    

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.525,
        chartHeight = 550,
        leftPadding = 47, 
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, 92359*1.1]); // set to first column mas in 2022CountyHealth
    
    
    //begin script when window loads
    window.onload = setMap();
    
    //set up choropleth map
    function setMap(){
   
        //map frame dimensions
        var width = window.innerWidth * 0.4,
            height = 550;
    
        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        //create Albers equal area conic projection centered on Wisconsin
        var projection = d3.geoAlbers()
            .center([0, 45])
            .rotate([89.8, 0, 0])
            .parallels([25.4, 45.5])
            .scale(6000)
            .translate([width / 2, height / 2]);
        
        var path = d3.geoPath()
            .projection(projection);
    
        var promises = [];
        promises.push(d3.csv("data/2022CountyHealth.csv"));  //load attributes from csv County Health
        promises.push(d3.json("data/WI_Counties.topojson")); //load WI county layer for choropleth data
        Promise.all(promises).then(callback);
    
        function callback(data){
    
            [csvData, wisconsin] = data;
    
            //translate counties TopoJSON
            var wiCounties = topojson.feature(wisconsin, wisconsin.objects.WI_Counties).features;
    
            //join csv data to GeoJSON enumeration units
            wiCounties = joinData(wiCounties, csvData);
    
            //create the color scale
            var colorScale = makeColorScale(csvData);
    
            //add enumeration units to the map
            setEnumerationUnits(wiCounties, map, path, colorScale);
    
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
    
            // dropdown
            createDropdown(csvData);
    
        };
    }; //end of setMap()
    
    function joinData(wiCounties, csvData){
 
        //loop through csv to assign each set of csv attribute values to geojson county
        for (var i=0; i<csvData.length; i++){
            var csvCounty = csvData[i]; //the current county
            var csvKey = csvCounty.COUNTY_NAM; //the CSV primary key, edited to match
    
            //loop through geojson counties to find correct region
            for (var a=0; a<wiCounties.length; a++){
    
                var geojsonProps = wiCounties[a].properties; //the current county geojson properties
                var geojsonKey = geojsonProps.COUNTY_NAM; //the geojson primary key
    
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    
    
        return wiCounties;
    };
    
//function to create color scale generator / use colors from County Health Report
function makeColorScale(data){
    var colorClasses = [
        "#E3D3E2", //lightest
        "#C7A7C5",
        "#AC7BA9",
        "#904F8C",
        "#74236F" //darkest
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
}; 

    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };
    
    function setEnumerationUnits(wiCounties, map, path, colorScale){
        
        //add wisconsin counties to map
        var counties = map.selectAll(".counties")
            .data(wiCounties)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "counties" + d.properties.COUNTY_NAM;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
        
        //style descriptor to each path
        var desc = counties.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        //set bars for each county
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.COUNTY_NAM;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 550 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
    
        //add style descriptor to each rect
        var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 58)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + ' by County'); //only need expressed for tile

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    };
    
   //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });
    
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute"); //CHANGE "SELECT ATTRIBUTE"
    
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;
    
        // change yscale dynamically
        csvmax = d3.max(csvData, function(d) { return parseFloat(d[expressed]); });
        
        yScale = d3.scaleLinear()
            .range([chartHeight - 10, 0])
            .domain([0, csvmax*1.1]);
    
        //updata vertical axis 
        d3.select(".axis").remove();
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //place axis
        var axis = d3.select(".chart")
            .append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
        
    
        //recreate the color scale
        var colorScale = makeColorScale(csvData);
    
        //recolor enumeration units
        var counties = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){ //THIS IS WHERE THE FUNCTION TO CHANGE COUNY COLORS BREAKS. there is no error
                return choropleth(d.properties, colorScale)
            });
    
        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
    
        updateChart(bars, csvData.length, colorScale);
    };
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 540 - yScale(parseFloat(d[expressed])); //463?? SPECIFIC TO DATA?
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });
        
        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " by County");
    };
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.COUNTY_NAM)
            .style("stroke", "#D9BE52")
            .style("stroke-width", "2.5");
        
        setLabel(props);
    };
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.COUNTY_NAM)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
        
        //removes info label
        d3.select(".infolabel")
            .remove();
    
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
    
            var styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };
    };
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";
    
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.COUNTY_NAM + "_label")
            .html(labelAttribute);
    
        var countyName = infolabel.append("div") 
            .attr("class", "labelname")
            .html(props.COUNTY_NAM);
    };
    
    //move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
    })(); //last line of main.js
