//Following function was borrowed from http://javascriptisawesome.blogspot.com/
(function(){
	var _waitUntilExists = {
		pending_functions : [],
		loop_and_call : function()
		{
			if(!_waitUntilExists.pending_functions.length){return}
			for(var i=0;i<_waitUntilExists.pending_functions.length;i++)
			{	
				var obj = _waitUntilExists.pending_functions[i];
				var resolution = document.getElementById(obj.id);
				if(obj.id == document){
					resolution = document.body;
				}
				if(resolution){
					var _f = obj.f;
					_waitUntilExists.pending_functions.splice(i, 1)
					if(obj.c == "itself"){obj.c = resolution}
					_f.call(obj.c)							
					i--					
				}
			}
		},
		global_interval : setInterval(function(){_waitUntilExists.loop_and_call()},5)
	}
	if(document.addEventListener){
		document.addEventListener("DOMNodeInserted", _waitUntilExists.loop_and_call, false);
		clearInterval(_waitUntilExists.global_interval);
	}
	window.waitUntilExists = function(id,the_function,context){
		context = context || window
		if(typeof id == "function"){context = the_function;the_function = id;id=document}
		_waitUntilExists.pending_functions.push({f:the_function,id:id,c:context})
	}
	waitUntilExists.stop = function(id,f){
		for(var i=0;i<_waitUntilExists.pending_functions.length;i++){
			if(_waitUntilExists.pending_functions[i].id==id && (typeof f == "undefined" || _waitUntilExists.pending_functions[i].f == f))
			{
				_waitUntilExists.pending_functions.splice(i, 1)
			}
		}
	}
	waitUntilExists.stopAll = function(){
		_waitUntilExists.pending_functions = []
	}
})();

function get_random_color(){
    var letters = '0123456789ABCDEF' .split('');
    var color = '#';
    for (var i = 0; i < 6; i++){
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

/**
 * This function will be used in place of GetNewTaskParameters in ogTasks.SubmitNewTask when this event is triggered from inside gantt chart.
 * 
 * @param string wrapWith
 * @param integer task_id
 * @returns {undefined}
 */
ogTasks.GetNewGanttTaskParameters = function(wrapWith,task_id) {
    var ganttTask = ogTasks.ganttChart.getTask("task_"+task_id);
    var task = ogTasks.getTask(task_id);
    var parameters = [];
    if(task.parentId){
        parameters['parent_id'] = ogTasks.ganttChart.getTask(task.parentId);
    }
    parameters['assigned_to_contact_id'] = task.assignedToId;
    parameters['control_dates'] = false;
    if(task.TimeEstimate){
        var minutes = parseInt(task.TimeEstimate);
        parameters['hours'] = (minutes - (minutes % 60))/60;
        parameters['minutes'] = (minutes % 60);
    }
    parameters['name'] = task.title;
//    parameters['notify'] = false;
    parameters['priority'] = task.priority;
    parameters['percent_completed'] = Math.round(ganttTask.progress * 100);
    parameters['task_due_date'] = ganttTask.end_date.add(Date.MINUTE, -(ganttTask.end_date.getTimezoneOffset())).format('d/m/Y'); // (new Date(task.dueDate)).format('d/m/Y');
    parameters['task_start_date'] = ganttTask.start_date.format('d/m/Y'); // (new Date(task.startDate).format('d/m/Y'));
    parameters['text'] = task.description;
    
    	if (wrapWith) {
		var params2 = [];
		for (var i in parameters) {
			if (parameters[i] || parameters[i] === 0) {
				params2[wrapWith + "[" + i + "]"] = parameters[i];
			}
		}
//		if (og.config.multi_assignment == 1) {
//			if (typeof window.loadMultiAssignmentHtml == 'function') {
//				params2["multi_assignment"] = Ext.util.JSON.encode(multi_assignment);
//			}
//		}
		return params2;
	} else {
//		if (og.config.multi_assignment == 1) {
//			if (typeof window.loadMultiAssignmentHtml == 'function') {
//				parameters["multi_assignment"] = Ext.util.JSON.encode(multi_assignment);
//			}
//		}
		return parameters;
	}
}

/**
 * 
 * @param {array} tasks: array of items to parse. It starts out with groups then tasks then (because of recursion) subtasks
 * @param {array} taskListParsed: array to pack parsed task items into
 * @param {object} parent: the single parent object whether it be group or task
 * @returns {array} taskListParsed: stacked array of parsed tasks to process in gantt
 */
ogTasks.taskParseRecursive = function(tasks, taskListParsed, parent){
    tasks.forEach(function(task){
        //if the task has no start date and no subtasks, gantt chart will throw a fit
        if(!task.startDate && task.subtasks.length <= 0){
            return;
        }
        var aDate = null;// new Date();
        var duration = 0;
        if(task.startDate && task.dueDate){
            var aDate = new Date(task.startDate * 1000);
            aDate = aDate.add(Date.MINUTE, aDate.getTimezoneOffset()).format('d-m-Y');
            duration = (task.dueDate - task.startDate)/60/60/24 + 1;
        }   
        var taskObject = {
            id:"task_" + task.id, 
            taskId:task.id,
            text:task.title, 
            start_date:aDate, 
            duration:duration, 
            progress:task.percentCompleted/100, 
            task_color: parent.taskColor,
            open:task.percentCompleted == 100 ? false : true,
            objectType:'task',
            parent: parent.gantt_group_id || "task_" + parent.id
        }
        if(ogTasks.getUser(task.assignedToId) && ogTasks.getUser(task.assignedToId).name){
            taskObject.assignedTo = ogTasks.getUser(task.assignedToId).name;
        }else{
            taskObject.assignedTo = 'unassigned';
        }      
        taskObject.estimatedTime = task.estimatedTime;
        taskObject.TimeEstimate = task.TimeEstimate;
        taskListParsed.data.push(taskObject);
        taskListParsed = ogTasks.taskParseRecursive(task.subtasks, taskListParsed, task);
    });
    return taskListParsed;
}

/**
 * 
 * @param object ogTasks.Groups object
 * @returns {Array|ogTasks.convertTasksToGantt.tasks|ogTasks.gantTasks}
 */
ogTasks.convertTasksToGantt = function(groups){
    var groups = ogTasks.Groups.length>0 ? ogTasks.Groups : groups;
    if(!groups && !ogTasks.Groups){
        return [];
    }
    var tasks = ogTasks.gantTasks = {data:[]};
    groups.forEach(function(group){
        if(group.group_tasks.length <= 0){
            return;
        }
        group.percentCompletedArray = [];
        group.status = 1;
        group.taskColor = get_random_color();
        group.group_tasks.forEach(function(task){
            group.percentCompletedArray.push(task.percentCompleted);
            group.status = group.status && task.status;
        });
        //Set the average percentCompleted from all of the grouped tasks
        group.percentCompleted = 0;
        group.percentCompletedArray.forEach(function(num){
            group.percentCompleted += parseInt(num);
        });
        group.percentCompleted = parseInt(group.percentCompletedArray.length > 0 ? group.percentCompleted/group.percentCompletedArray.length : 0);
        group.group_id = group.group_id == "unclassified" ? 0 : group.group_id;
        group.gantt_group_id = "groupBy_"+group.group_id;
        var taskObject = {
                    id:group.gantt_group_id,
                    group_id : group.group_id,
                    icon:group.group_icon,
                    text:group.group_name, 
                    progress:group.percentCompleted/100, 
                    task_color:group.taskColor,
                    objectType: 'group',
                    open:group.percentCompleted == 100 ? false : true}
        taskObject.assignedTo = '';
        //If there is a duedate for the milestone but it has no tasks, we need to give it an end_date and start_date or gantt 
        //will not know what to do. Take the created end_date and only subtract 10 minutes from it so it shows in the one date
        if(group.group_tasks.length < 1 && group.duedate){
            taskObject.end_date = group.end_date = new Date(group.duedate *1000);
            taskObject.start_date = group.start_date = group.end_date.add(Date.MINUTE, -10);
        }
        tasks.data.push(taskObject);
        //This form of object pass and return functions the same as passing an object by reference
        tasks = ogTasks.taskParseRecursive(group.group_tasks, tasks, group);
    });
    return tasks;
}

/**
 * 
 * @param {string} tasksPanelContent : div where the gantt div will get inserted into
 * @returns {jQuery object} tasksPanelGantt: div gantt chart will get rendered to
 */
ogTasks.createTasksPanelGantt = function(tasksPanelContent){
    var tasksPanelGantt = $('<div id="tasksPanelGantt"></div>');
    tasksPanelGantt.css({width: '100%', height: '400px', overflow: 'hidden', scroll: 'auto'});
    $('#' + tasksPanelContent).append(tasksPanelGantt);
    return tasksPanelGantt;
}
/**
 * 
 * @param string Name of tasksPanelContent where gantt panel will get rendered
 * @param array Array of task objects that DHTMLXgantt understands
 * @returns object DHTMLXgantt 
 */
ogTasks.drawGanttTo = function(tasksPanelGantt, tasks) {
    if(!tasksPanelGantt){
        return {};
    }
    var polisgantt = $(tasksPanelGantt).dhx_gantt({
//        data: tasks,
        "scale_unit": "month",
        date_scale: "%F, %Y",
        subscales: [
//            {unit: "week", step: 1, template: weekScaleTemplate},
            {unit: "day", step: 1, date: "%d"}
        ],
        "step": 1,
//        api_date: "%d-%m-%Y",
        columns: [
            {name: "text", label: "Tasks", tree: true, width: '*'},
            {name: "assignedTo", label: "Assigned To", tree: false, width:'100'}
        ],
        fit_tasks: true,
        scale_height: 40,
//                show_progress : true,
//        sort: true,
        task_height: 15,
        row_height: 20,
        min_column_width : 30,
        order_branch : true,
        buttons_left : ["complete_btn","dhx_save_btn", "dhx_cancel_btn"],
        buttons_right : ["dhx_delete_btn"],
        quickinfo_buttons : ["icon_delete", "quick_edit_button"]
    });
    polisgantt.parse(tasks);
//    for(var i=0; i< tasks.data.length; i++){
//        if(tasks.data[i].start_date || tasks.data[i].objectType == 'group'){
//            polisgantt.addTask(tasks.data[i]);
//        }
//    }
    
    tasksPanelGantt.hide();
    
    polisgantt.attachEvent("onTaskDblClick", function(id, e){
        var task = polisgantt.getTask(id);
        if (task.$level > 0){
            og.openLink('index.php?c=task&a=view&id=' + task.taskId);
        }
    });
    
    polisgantt.$click.buttons.quick_edit_button = function(id){
        var task_id = polisgantt.getTask(id).taskId;
        if(task_id){
            var dialog = new Ext.Window({
                title: 'Task Quick Editor',
                id: "dlgTaskQuickEdit",
                resizable: false,
                style:'max-width:1000px',
                autoHeight: true,
                html: '<div id="divTaskQuickEdit" style="width:950px;"></div>'
            });
            dialog.addListener('show', function(e){
                ogTasks.drawGanttEditTaskForm(task_id, 0, 'divTaskQuickEdit');
            }, this);
            dialog.show();
            $('#divTaskQuickEdit .submit, #ogTasksPanelATShowAll').on('click', function(e){
                dialog.close();
            })
        }
        return false;
    }
    
    polisgantt.$click.buttons.delete = function(id){
        if(confirm(lang('confirm move to trash')) && id.indexOf('task') >= 0){
            og.openLink('/fengoffice/index.php?c=object&a=trash&object_id=25');
        }
    }
    
    polisgantt.attachEvent('onAfterTaskDrag', function(id,mode,e){
        ogTasks.tempFunction = ogTasks.GetNewTaskParameters;
        ogTasks.GetNewTaskParameters = ogTasks.GetNewGanttTaskParameters;
        ogTasks.SubmitNewTask(polisgantt.getTask(id).taskId, true);
        ogTasks.GetNewTaskParameters = ogTasks.tempFunction;
    });
    return polisgantt;
}

//Copied from drawEditTaskForm in addTask.js to accommodate adding a quick edit to gantt chart that uses feng functions.
ogTasks.drawGanttEditTaskForm = function(task_id, group_id, containerId) {
    var task = ogTasks.getTask(task_id);
    var containerName = containerId;
    if (task) {
        // if description not loaded yet then load description before drawing form
        if ((!task.description || task.description == '') && !ogTasks.all_descriptions_loaded) {
            og.openLink(og.getUrl('task', 'get_task_data', {id: task_id, desc: 1}), {callback: function(success, data) {
                task.description = data.desc;
                ogTasks.performDrawEditTaskForm(containerName, task);
                }, scope: this});
        } else {
            ogTasks.performDrawEditTaskForm(containerName, task);
        }
    }
}

$('<link>')
  .appendTo($('head'))
  .attr({type : 'text/css', rel : 'stylesheet'})
  .attr('href', '/fengoffice/plugins/polisgantt/public/assets/css/dhtmlxgantt.css');
  
  $('<link>')
  .appendTo($('head'))
  .attr({type : 'text/css', rel : 'stylesheet'})
  .attr('href', '/fengoffice/plugins/polisgantt/public/assets/css/skins/dhtmlxgantt_broadway.css');

//Need to set any last minute style settings for the page here.
//This will overwrite the css in above css link
$('<style type="text/css">.complete_btn_set {background: none repeat scroll 0 0 black;} .weekend{background: #cccccc;}</style>').appendTo($('head'));

/**
 * Loads 3 scripts necessary for dhtmlxgantt and scripts are stored in a variable
 * to eval later instead of reloading scripts to get them to run again.
 * This style of function call works as an immediate function as well as storing its script for later use.
 * @returns {Boolean}
 */
(ogTasks.loadGanttScripts = function() {
    if (ogTasks.ganttJS && ogTasks.ganttTooltipJS && ogTasks.gantt_quick_info) {
        eval(ogTasks.ganttJS);
        eval(ogTasks.ganttTooltipJS);
        eval(ogTasks.gantt_quick_info);
        ogTasks.loadGanttTemplates();
        return true;
    }
    $.ajax({
        url: "/fengoffice/plugins/polisgantt/public/assets/javascript/dhtmlxgantt.js",
        dataType: "script",
        error: function(jqXHR, status, error) {
            console.log(error);
        },
        success: function(data, status, jqXHR) {
            ogTasks.ganttJS = data;

            $.ajax({
                url: "/fengoffice/plugins/polisgantt/public/assets/javascript/ext/dhtmlxgantt_tooltip.js",
                dataType: "script",
                success: function(data, status, jqXHR) {
                    ogTasks.ganttTooltipJS = data;
                }
            });

            $.ajax({
                url: "/fengoffice/plugins/polisgantt/public/assets/javascript/ext/dhtmlxgantt_quick_info.js",
                dataType: "script",
                success: function(data, status, jqXHR) {
                    ogTasks.gantt_quick_info = data;
                }
            });
        }
    });
    if (ogTasks.ganttJS) {
        return true;
    }else{
        return false;
    }
})();

/**
 * Function sets templates for gantt control
 * @returns void
 */
ogTasks.loadGanttTemplates = function(){
    gantt.templates.task_row_class = function(start, end, item) {
        return item.$level == 0 ? "gantt_project" : ""
    }
    gantt.templates.task_class = function(start, end, item) {
        return item.$level == 0 ? "gantt_project" : ""
    }
    gantt.templates.task_text = function(start, end, task) {
        var TimeEstimate = task.TimeEstimate > 0 ? "of " + task.TimeEstimate + " Minutes" : '';
        if (task.progress == 0) {
            return "0% " + TimeEstimate;
        } else {
            return Math.round(task.progress * 100) + "% " + TimeEstimate;
        }
    }
    //Mark the weekends
    gantt.templates.scale_cell_class = function(date){
        if(date.getDay()==0 || date.getDay()==6){
            return "weekend";
        }
    }
    gantt.templates.task_cell_class = function(item, date){
        if(date.getDay()==0 || date.getDay()==6){
            return "weekend";
        }
    }
    
    gantt.templates.progress_text = function(start, end, task) {
        return "";
    }
    gantt.templates.grid_folder = function(group) {
        if (group && group.icon && group.icon != 'undefined') {
            return "<div style='display:inline-block;color:transparent; padding-left:20px; background-repeat:no-repeat;' class='" + group.icon + "'>h</div>";
        } else {
            return "<div class='gantt_tree_icon gantt_folder_" + (group.$open ? "open" : "closed") + "'></div>";
        }
    }
    gantt.templates.quick_info_content = function(start, end, task){
        if(ogTasks.getTask && ogTasks.getTask(task.taskId)){
            return '<div style="white-space:pre-line">' + ogTasks.getTask(task.taskId).description || task.text + '</div>';
        } else {
            return task.text;
        }
        
    }
    gantt.locale.labels["complete_btn"] = "Complete";
    gantt.locale.labels["quick_edit_button"] = "Quick Edit";
}
var weekScaleTemplate = function(date){
    var dateToStr = gantt.date.date_to_str("%d %M");
    var endDate = gantt.date.add(gantt.date.add(date, 1, "week"), -1, "day");
    return dateToStr(date) + " - " + dateToStr(endDate);
}; 

waitUntilExists('tasks-panel', function(){
    var tasksPanel = Ext.getCmp('tasks-panel');
    tasksPanel.on('add', function(t, comp, index){ //this can be used because only one panel is ever added to this panel
        waitUntilExists("tasksPanelTopToolbarObject", function(){  //now wait until the tasks toolbar is visible
            var topToolbarObject = Ext.getCmp('tasksPanelTopToolbarObject');
            topToolbarObject.on('render', function(){  //Each time the panel adds its child, this tool bar is re-rendered so need to add the listener.
                //If the button has not been added to the bar, do it.
                if(!document.getElementById('ganttButton')){
                    topToolbarObject.addButton({
                        text: 'view as Gantt',
                        iconCls: 'ico-gantt',
                        id: 'ganttButton',
                        enableToggle: true,
                        toggleHandler: function(button, state){
                            if(state){
                                $('#tasksPanelContainer').hide();
                                $('#tasksPanelGantt').show();
                            }else{
                                $('#tasksPanelContainer').show();
                                $('#tasksPanelGantt').hide();
                            }
                        }
                    })
                }
            })
        })
        waitUntilExists("tasksPanelContent", function(){            
            //this function loads all of the data from an invisible input element. The data is put there from an ajax call.
            ogTasks.loadDataFromHF();
            var tasks = {data:[]};
            var onGroupTasks = function(groups){
                tasks = ogTasks.convertTasksToGantt(groups); 
                var testing = document.getElementById('tasksPanelGantt');
                if(testing && ogTasks.ganttChart){
                    ogTasks.ganttChart.clearAll();
                    ogTasks.ganttChart.parse(tasks);
                }else{
                    ogTasks.loadGanttScripts();
                    var tasksPanelGantt = ogTasks.createTasksPanelGantt('tasksPanelContent');
                    //Commented out so that no gantt chart is created ----------------- for testing purposes only
                    ogTasks.ganttChart = ogTasks.drawGanttTo(tasksPanelGantt, tasks);
                }
            }//end of onGroupTasks
            //Add a function action to the groupTasks function to kick off our routine
            if(!ogTasks.onGroupTasks){
                ogTasks.groupTasksTemp = ogTasks.groupTasks;
                ogTasks.onGroupTasks = onGroupTasks;
                ogTasks.groupTasks = function(displayCriteria, tasksContainer){
                    var temp = ogTasks.groupTasksTemp(displayCriteria, tasksContainer);
                    ogTasks.onGroupTasks(temp);
                    return temp;
                }
            }
        });
    })
});

