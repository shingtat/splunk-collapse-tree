# Collapse Tree App

README.md

***Purpose***
1. The purpose of this app is to view event dependencies in a clear manner and show the urgency of the event

2. To achieve this task, the following data tables are used:
	```
	GPAParallelScheduler.DepEng.Event
	GPAParallelScheduler.DepEng.EventDependency
	GPAParallelScheduler.Monitoring.ActualEventCheckPoint
	GPAParallelScheduler.Monitoring.ExpectedEventCheckPoint
	```

***Current Status***
1.  Currently able to dynamically update tree given changes in data

2.  Node reflects the service level (urgency) of the event

***Installing Project***
1. Copy code and paste it in $SPLUNK_HOME/etc/apps directory

***Running Project***
1.  Open up terminal of choice (cmd or Terminal)

2.  Navigate to $SPLUNK_HOME/bin/

3.  Run ```splunk start```

4.  Navigate to $SPLUNK_HOME/etc/apps/collapse_tree_app/appserver/static/visualizations/collapse_tree

5.  Run ```npm install``` if npm is not installed

6.  Login to Splunk Web (server:port). By default, Splunk is run on port 8000. (eg. localhost:8000)

7. 	Navigate to "Search and Reporting App"

8.  If Splunk is connected to DB, directly run query
```
select e.EventKey, d.DependsOnEventKey, e1.EventDescription as 'DependsOnEventDescription',
Max(cp.ExpectedDateTime) as 'DependsExpectedDateTime', Max(cp.updateDateTime) as 'DependsUpdateTime',
Max(cp.ActualServiceLevelCode) as 'DependsEventServiceLevelCode', Max(ep.ServiceLevelSetName) as 'DependsEventServiceLevelSetName'
from GPAParallelScheduler.DepEng.Event e (nolock)
inner join GPAParallelScheduler.DepEng.EventDependency d (nolock) on d.EventKey = e.EventKey
left join GPAParallelScheduler.DepEng.Event e1 (nolock) on e1.EventKey = d.DependsOnEventKey
inner join GPAParallelScheduler.Monitoring.ActualEventCheckPoint cp (nolock) on cp.EventKey = d.DependsOnEventKey
inner join GPAParallelScheduler.Monitoring.ExpectedEventCheckPoint ep (nolock) on ep.EventKey = d.DependsOnEventKey
where e.EventTypeCode = 'Depend' and e.IsActive = 1 and d.IsActive = 1 and d.IsOptional = 0
group by e.EventKey, d.DependsOnEventKey, e1.EventDescription
```
Otherwise run ```| inputlookup event_complete_monitor.csv``` which is included in the code copied to the apps directory

9. 	Select Visualization

10. Select "Collapse Tree" visualization

11. To format the graph, click "Format".
	* ```Search``` tab allows for user to filter the particular event by region or manual input text search
	* ```General``` tab allows user to change the graph's path length, radius, width and height
	* ```Color``` tab allows user to manually change the color of the red, amber and green service levels

12. Using Search function:
	* Filtering and search can only be used one at a time
	* If filter is used, all other regions must be "None" while search bar must be cleared
	* If search is used, all regions must be "None"

***Making Changes***
1. Enable development mode
* You can enable development mode by adding the following settings to the web.conf configuration file in etc/system/local. If you do not already have a local copy of this file, create one and add these settings.
```
[settings]
minify_js = False
minify_css = False
js_no_cache = True
cacheEntriesLimit = 0
cacheBytesLimit = 0
enableWebDebug = True
```

2.  Navigate to $SPLUNK_HOME/etc/apps/collapse_tree_app/appserver/static/visualizations/collapse_tree

3.  Run ```npm run watch``` before you make any code changes otherwise changes won't be reflected on front-end on Splunk web

4. 	Make sure you refresh cache if changes aren't appearing.
```
Command + Shift + R
```
* Some effects may take longer for Splunk to recognize, even when development mode is set or if force cache refresh is used

5. 	If that doesn't work, navigate to search app and rerun query once again

6. 	Changes in formatter.html will only be seen once splunk is restarted. To restart splunk, navigate to $SPLUNK_HOME/bin and run
```
splunk restart
```

7. 	To use best practices, download an app from Splunk and look at app code

**Folder Structure**
* appserver
 	* static
		* visualizations
			* collapse_tree
				* node_modules
				* src
* default
* lookups
* metadata
* README


**Explanation of Individual Files**
#### Table of Contents:
1. [collapse_tree.js](#collapsetreejs)
2. [formatter.html](#formatterhtml)
3. [package.json](#packagejson)
4. [visualization.css](#visualizationcss)
5. [visualization.js](#visualizationjs)
6. [webpack.config.js](#webpackconfigjs)
7. [savedsearches.conf](#savedsearchesconf)
8. [savedsearches.conf.spec](#savedsearchesconfspec)
9. [visualizations.conf](#visualizationsconf)
7. [default.meta](#defaultmeta)

#### collapse_tree.js
* The main file where logic of the visualization is written
* Contains 2 important methods ```formatData()``` and ```updateView()```
* Essentially where tree is drawn

[Back to Table of Contents](#table-of-contents)

#### formatter.html
* Where users can directly manage customizations for graph
* Can allow users to input dynamic text, select options and choose their own colors

[Back to Table of Contents](#table-of-contents)

#### package.json
*	List of dependencies needed for this application using npm

[Back to Table of Contents](#table-of-contents)

#### visualization.css
* All the css for collapse_tree.js
* css for divs, animations, nodes

[Back to Table of Contents](#table-of-contents)

#### visualization.js
* Splunk library to run js scripts

[Back to Table of Contents](#table-of-contents)

#### visualization.js.map
* Splunk library to run js scripts

[Back to Table of Contents](#table-of-contents)

#### webpack.config.js
* Settings to compile code
* If ```npm run watch``` does not work, chances are it is settings that must be configured in this file

[Back to Table of Contents](#table-of-contents)

#### savedsearches.conf
* Sets default values for declared in formatter.html

#### savedsearches.conf.spec
* Sets the types for the values declared in savedsearches.conf for formatter.html

#### visualizations.conf
* Sets attributes when you hover over visualization selection

#### default.meta
* Exports app so that visualization can be used for other applications such as "Search"

[Back to Table of Contents](#table-of-contents)

# Troubleshooting
If the following error message occurs:
```
npm ERR! Failed at the collapse_tree@1.0.0 build script '$SPLUNK_HOME/bin/splunk cmd node ./node_modules/webpack/bin/webpack.js'.
npm ERR! Make sure you have the latest version of node.js and npm installed.
npm ERR! If you do, this is most likely a problem with the collapse_tree package,
```
Run:
```
echo $SPLUNK_HOME
```
If response is empty or null, run the following command.
* Mac:
```
export SPLUNK_HOME=/Applications/Splunk
```
* Windows:
```
setx $SPLUNK_HOME "C:\Program Files\Splunk"
```

Navigate to package.json file and ensure that scripts are the following
```
$SPLUNK_HOME/bin/splunk cmd node ./node_modules/webpack/bin/webpack.js -d --watch --progress"
```

## More Information
For more information on building custom visualizations including a tutorial, API overview, and more see:

http://docs.splunk.com/Documentation/Splunk/6.5.0/AdvancedDev/CustomVizDevOverview


# Splunk Visualization App Template

This is the basic template for a splunk visualization app. This teamplate is meant to be edited to build custom visualizations. It contains:

- The relevant directory structure for a visuzliation app
- A standin visualization package directory with a standin visualiztion and a basic webpack configuration
- Relevant .conf files for the visualization

## Building the visualization

	NOTE: You must have npm installed in oder to build. If you do not have npm installed, install it and come back.

The visualization contained in this app must be built using web pack in order to run it on Splunk. There is a basic webpack configuration built in to the app. To build from the command line, first, cd to the *visualization/standin* directory. On the first run you will have to install the dependeincies with npm:

```
$ npm install
```
Once you done that, you can build the viz with the provided build task:

```
$ npm run build
```

This will create a *visualization.js* file in the visualization directory.
