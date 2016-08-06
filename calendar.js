function _hasRangeAdjacency(x1, x2, y1, y2){
	if(x2 < x1 || y2 < y1){
		throw "Invalid Range: Ensure inputs(x1,x2,y1,y2) are ordered such x2 >= x1 and y2 >= y1"
	}
	var w1 = x2 - x1;
	var w2 = y2 - y1;
	var min = y2 > x2 ? x1 : y1;
	var max = y2 > x2 ? y2 : x2;
	if((max - min) >= w1 + w2){
		return false;
	} else {
		return true;
	}
}

function _convertToTimeObject(minutes){
	if(minutes < 0 || minutes > 1440){throw 'Input Error: must be bound by 0 <= input <= 1440'};
	var hr = (Math.floor(minutes / 60) > 12 || Math.floor(minutes / 60) === 0 ? Math.abs(Math.floor(minutes / 60) - 12) : Math.floor(minutes / 60));
	var min =  ((minutes % 60) < 10 ? '0' + minutes % 60 : minutes % 60);
	var appendix =  (Math.floor(minutes / 60) >= 12 && Math.floor(minutes / 60) !== 24 ? 'PM' : 'AM');
	var timestring = hr + ':' + min
	return {
		timestring: timestring,
		appendix: appendix,
		isWholeHour: minutes % 60 === 0 ? 1 : 0
	}
}

function _maxCardinality(numVertex){
	return numVertex * (numVertex - 1)/2;
}

function _determineCardinalityMagnitude(numVertex, cardinality){
	var maxMagnitude = numVertex;
	var magnitude = numVertex;
	for(var i =0;i<numVertex;i++){
		var currentMagnitude = maxMagnitude - i;
		if(cardinality >= _maxCardinality(currentMagnitude)){
			magnitude = currentMagnitude;
			break;
		}
	}
	return magnitude;
}

function Calendar(width, height, start, end, timescale, entryEle){
	this.width = width;
	this.height = height;
	this.start = start;
	this.end = end;
	this.timescale = timescale;
	this.entryEle = $(entryEle);
	this.innerContainer = $('<div class="calendar-container-inner"></div>');
	this.timeScaleContainer = $('<div class="calendar-timescale"></div>');
}

Calendar.prototype.initEvents = function(events){
	this.events = events;
}

Calendar.prototype.initCardinalityMap = function(){
	this.cardinalityMap = {};
}

Calendar.prototype.initEventGroupMap = function(){
	this.eventGroupMap = {};
}
Calendar.prototype.initEventGroupCardinalityMap = function(){
	this.eventGroupCardinalityMap = {};
}

Calendar.prototype.initAdjacencyList = function(events){
	this.adjacencyList = [];
	var prevEventObj = null;
	//loop through all events
	for(var i=0;i<events.length;i++){
		//find current event and initialize its adjacencyList
		var eventObj = events[i];
		this.adjacencyList[i] = [];
		//skip first iteration
		if(i === 0){prevEventObj = eventObj;continue;}
		//look at previous event object's adjacencies
		var prevAdjacentAdjacencies = this.adjacencyList[i - 1];
		if(prevAdjacentAdjacencies.length > 0){
			//loop through each of previous event object's adjacencies
			for(var j = 0;j< prevAdjacentAdjacencies.length;j++){
				//look at previous event's adjacent event j
				var prevAdjacentAdjacencyIndex = prevAdjacentAdjacencies[j];
				//determine if current event (i) is adjacent to  previous event's adjacent event j
				//and update the adjacency list for both events i and j
				this.updateAdjacencyList(i, prevAdjacentAdjacencyIndex);			
			}
		}
		//determine if current event (i) is adjacent to previous event (i - 1)
		//and update the adjacency list
 		this.updateAdjacencyList(i, i-1);
		var prevEventObj = eventObj;
	}
	return this.adjacencyList;
}

Calendar.prototype.updateAdjacencyList = function(event1Index, event2Index){
	var event1 = this.events[event1Index];
	var event2 = this.events[event2Index];
	if(_hasRangeAdjacency(event1.start, event1.end, event2.start, event2.end)){
		this.adjacencyList[event1Index].push(event2Index);
		this.adjacencyList[event2Index].push(event1Index);
	}
}

Calendar.prototype.determineEventGroupAdjacencyCardinality = function(eventIndex){
	//create ordered group that includes event + event's adjacency group
	var adjacents = this.adjacencyList[eventIndex];
	var eventGroup = this.mergeIntoEventGroup([eventIndex], adjacents);
	//check if adjacencyCardinality for eventgroup has already been calculated
	if(this.eventGroupCardinalityMap[Object.keys(eventGroup)]){
		return this.eventGroupCardinalityMap[Object.keys(eventGroup)];
	}
	var cardinality = 0
	//loop through all event in group
	for(event in eventGroup){
		var adjacents = this.adjacencyList[event];
		//loop through all event's adjacent event(i)
		for(var i = 0;i < adjacents.length;i++){
			//event's adjacent event(@i) increases the group's adjacency cardinality 
			//if event(@i) is adjacent to any of group's events
			var index = adjacents[i];
			if(eventGroup[index]){
				cardinality += 1;
			}
		}
	}
	//(cardinality / 2) because the same adjacency is stored in both of its events
	this.eventGroupCardinalityMap[Object.keys(eventGroup)] = cardinality/2;
	return cardinality/2;
}

Calendar.prototype.mergeIntoEventGroup = function (eventsArr1, eventsArr2){
	//create ordered eventGroup by merging two sorted event arrs
	//uses two indexes instead of Array.shift() for performance
	var indexInGroup
	var group = {};
	var index1 = 0;
	var length1 = eventsArr1.length;
	var index2 = 0;
	var length2 = eventsArr2.length;
	var iterator = 0
	while (index1 < length1 && index2 < length2){
		if(eventsArr1[index1] < eventsArr2[index2]){
			group[eventsArr1[index1]] = 1;
			index1 += 1
			indexInGroup = iterator
		} else {
			group[eventsArr2[index2]] = 1;
			index2 += 1
		}
		iterator += 1;
	}
	if(index1 === length1){
		for(var i=index2;i<length2;i++){
			group[eventsArr2[i]] = 1;
			iterator += 1;
		}
	} else {
		for(var i=index1;i<length1;i++){
			group[eventsArr1[i]] = 1;
			indexInGroup = iterator
			iterator += 1;
		}
	}
	var leftAdjacentEvent = indexInGroup > 0 ? Object.keys(group)[indexInGroup - 1] : null;
	var firstAdjacentEvent = Object.keys(group)[0];
	this.eventGroupMap[eventsArr1[0]] = {
		eventGroup: group,
		indexInGroup: indexInGroup,
		leftAdjacentEvent: leftAdjacentEvent,
		firstAdjacentEvent: firstAdjacentEvent
	}
	return group;
}

Calendar.prototype.initEventCardinalityMagnitudeGraph = function(){
	//magnitude represents the order of organization of each event within the context of it's event group
	this.eventCardinalityMagnitudeGraph = {};
	for(var i =0;i<this.adjacencyList.length;i++){
		var cardinality = this.determineEventGroupAdjacencyCardinality(i);
		var magnitude =  _determineCardinalityMagnitude(this.adjacencyList[i].length + 1, cardinality);
		this.eventCardinalityMagnitudeGraph[i] = {
			cardinality: cardinality,
			magnitude: magnitude
		}
	}
	return this.eventCardinalityMagnitudeGraph;
}

Calendar.prototype.initAdjustedEventCardinalityMagnitudeGraph = function(){
	//adjusted magnitude for each event according to max magnitude of any event within it's event group
	this.adjustedEventCardinalityMagnitudeGraph = {};
	for(var i=0;i<this.adjacencyList.length;i++){	
		//check if adjusted magnitude has already been calculated
		if(this.adjustedEventCardinalityMagnitudeGraph[i]){
			continue
		}
		var unadjusted = this.eventCardinalityMagnitudeGraph[i];
		var unadjustedMagnitude = unadjusted.magnitude;
		var unadjustedMaxMagnitude = unadjustedMagnitude;
		for(var j = 0; j < this.adjacencyList[i].length;j++){
			//find the max unadjusted magnitude within event group
			var index = this.adjacencyList[i][j];
			var magnitude = this.eventCardinalityMagnitudeGraph[index].magnitude;
			if(magnitude > unadjustedMaxMagnitude){
				unadjustedMaxMagnitude = magnitude;
			}
		}
		//find adjusted magnitude and updates adjusted magnitude for all events within event group
		var adjustedMaxMagnitude = unadjustedMaxMagnitude;
		for(var k = 0; k < this.adjacencyList[i].length;k++){
			var index = this.adjacencyList[i][k];
			if(this.adjustedEventCardinalityMagnitudeGraph[index] && (this.adjustedEventCardinalityMagnitudeGraph[index] > adjustedMaxMagnitude)){
				adjustedMaxMagnitude = this.adjustedEventCardinalityMagnitudeGraph[k];
			}
		}
		this.adjustedEventCardinalityMagnitudeGraph[i] = adjustedMaxMagnitude;
	}
	return this.adjustedEventCardinalityMagnitudeGraph;
}

Calendar.prototype.initializeData = function(data){
	this.initEventGroupMap();
	this.initCardinalityMap();
	this.initEventGroupCardinalityMap();
	this.initEvents(data);
	this.initAdjacencyList(this.events);
	this.initEventCardinalityMagnitudeGraph()
	this.initAdjustedEventCardinalityMagnitudeGraph()
}

Calendar.prototype.renderShell = function(containerWait, timeScaleWait){
	this.renderContainer(containerWait);
	this.renderTimeScale(timeScaleWait);
}

Calendar.prototype.renderData = function(data, wait, animationInterval){
	this.innerContainer.empty();
	setTimeout(function(){
		this.initializeData(data);
		this.renderEvents(animationInterval);
	}.bind(this), (wait ? wait : 0))
}

Calendar.prototype.renderContainer = function(wait){
	setTimeout(function(){
		this.entryEle.append(this.innerContainer);
		this.entryEle.append(this.timeScaleContainer);
		this.entryEle.css('width', this.width);
		this.entryEle.css('height', this.height);
		this.entryEle.css('transform', 'scaleY(1)');
	}.bind(this), (wait ? wait : 0))
}

Calendar.prototype.renderTimeScale = function(wait){
	setTimeout(function(){
		var totalTime = this.end - this.start;
		var intervals = totalTime/this.timescale;
		var height = 100/(intervals + 1) + '%';
		for(var i = 0;i<= intervals;i++){
			var duration = this.start + i * this.timescale;
			var timescaleItem = this.renderTimeScaleItem(duration, height);
			(function(i, item, container){
				setTimeout(function(){
					container.append(item)
				}, i * 30)
			})(i, timescaleItem, this.timeScaleContainer)
		}
	}.bind(this), (wait ? wait : 0))
}

Calendar.prototype.renderTimeScaleItem = function(duration, height){
	var timescaleItem = this.renderTimeScaleItemContainer(duration);
	var timeScaleItemContent = this.renderTimeScaleItemContent(duration)
	timescaleItem.append(timeScaleItemContent);
	timescaleItem.css('height', height);
	return timescaleItem;
}

Calendar.prototype.renderTimeScaleItemContainer = function(duration){
	var timeObj = _convertToTimeObject(duration);
	return $('<div class="timescale-item' + (timeObj.isWholeHour ? ' interval' : '') + '"></div>');
}

Calendar.prototype.renderTimeScaleItemContent = function(duration){
	var timeObj = _convertToTimeObject(duration);
	var timestringText = timeObj.timestring;
	return $(
		'<div class="timescale-item-inner">'
		+
		'<span class="timestring">' 
		+ timestringText
		+ '</span>' 
		+ '<span class="appendix">'
		+ (timeObj.isWholeHour ? '&nbsp;&nbsp;' + timeObj.appendix : '') 
		+ '</span>'
		+ '</div>'
		);
}

Calendar.prototype.renderEvents = function(animationDelay){
	var entryEle = this.renderEventsEntryElement();
	for(var i = 0; i < this.events.length; i ++){
		this.renderEventItem(i, entryEle, animationDelay);
	}
}
Calendar.prototype.renderEventsEntryElement = function(){
	var innerContentContainer = $('<div class="calender-container-inner-content"></div>')
	this.innerContainer.append(innerContentContainer);
	return innerContentContainer;
}

Calendar.prototype.renderEventItem = function(i, entryElement, animationDelay){
	var eventItem = this.renderEventItemContainer();
	var width = this.calculateEventItemWidth(i);
	var height = this.calculateEventItemHeight(i);
	var top = this.calculateEventItemTop(i);
	var left = this.calculateEventItemLeft(i, width);
	this.saveEventParams(i, width, height, top, left);
	var eventItemContent = this.renderEventItemContent();
	eventItem.append(eventItemContent);
	this.appendEventItem(i, eventItem, entryElement, width, height, top, left, animationDelay);
}

Calendar.prototype.appendEventItem = function(i, eventItem, container, width, height, top, left, interval){
	eventItem.css('top', top.toFixed(2) + '%');
	eventItem.css('left', left.toFixed(2) + '%');
	(function(i, item, container, width, height, interval){
		setTimeout(function(){
			container.append(item);
				setTimeout(function(){
					item.css('width', width.toFixed(2) + '%');
					item.css('height', height.toFixed(2) + '%');
				}, 40)

		}, (i * interval))
	})(i, eventItem, container, width, height, interval)
}

Calendar.prototype.renderEventItemContent = function(){
	var eventItemContentContainer = this.renderEventItemContentContainer();
	var textContent = this.renderEventItemText();
	eventItemContentContainer.append(textContent);
	return eventItemContentContainer
}

Calendar.prototype.renderEventItemContainer = function(){
	return $('<div class="calendar-event-item"></div>');
}

Calendar.prototype.renderEventItemContentContainer = function(){
	return $('<div class="event-item-text"></div>')
}

Calendar.prototype.renderEventItemText = function(){
	return $('<div class="event-name">Sample Item</div><div class="event-location">Sample Location</div>')
}

Calendar.prototype.calculateEventItemWidth = function(i){
	return (1 / this.adjustedEventCardinalityMagnitudeGraph[i] * 100);
}

Calendar.prototype.calculateEventItemHeight = function(i){
	var eventObj = this.events[i];
	return ((eventObj.end - eventObj.start)/(this.end - this.start) * 100);
}

Calendar.prototype.calculateEventItemTop = function(i){
	var eventObj = this.events[i];
	return (eventObj.start / (this.end - this.start) * 100)
}

Calendar.prototype.saveEventParams = function(i, width, height, top, left){
	var eventObj = this.events[i];
	eventObj.width = width;
	eventObj.height = height;
	eventObj.top = top;
	eventObj.left = left;
}

Calendar.prototype.calculateEventItemLeft = function(i, width){
	var leftEventIndex = this.eventGroupMap[i].leftAdjacentEvent
	if(leftEventIndex){
		if(this.events[leftEventIndex].left + width >= 99.99){
			var firstAdjacentEvent = this.eventGroupMap[i].firstAdjacentEvent;
			if(firstAdjacentEvent && (firstAdjacentEvent !== leftEventIndex)){
				var left = this.events[firstAdjacentEvent].left + width
			} else {
				var left = 0;	
			}
		} else {
			var left = this.events[leftEventIndex].left + width
		}
	} else {
		var left = 0;
	}
	return left;
}

window.layOutDay = function(events){
	window.calendar.renderData(events, 0, 130)
}
