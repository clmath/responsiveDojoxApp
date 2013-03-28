define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/window",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/on",
	"dojo/_base/lang",
	"dojo/query",
	"dojox/css3/transit"
], function(declare, arrayUtil, win, _Container, _WidgetBase, dom, domConstruct, domAttr, domClass, on, lang, query, transit){

	// module:
	//		my/ResponsiveContainer
	
	return declare([_WidgetBase, _Container], {
		
		VIEW_ATTRIBUTE_NAME: "data-dojo-view",
		ID: "dojoResponsiveContainer",
		ANIMATION_DURATION: "0.7s",
		
		// MultiPanes variables
		_multiPanes: null,
		_MPslider: null,
		_MPstyle: null,
		_maxPanes: 3,
		//_visibleDepths: 0, // [0..maxPanes]
		_currentDepth: 0,
		_MPdepths: ["root"], //dummy element to start the index at 1 //FIXME pointer to domNode instead of string ?
		
		mainView: "view1",
		
		startup: function(){
			this.inherited(arguments);

			if(this.domNode.id){this.ID = this.domNode.id}
						
			// Applying the view class on the views
			var children = this.domNode.children;
			for (var i=0; i < children.length; i++){
				if (domAttr.has(children[i], this.VIEW_ATTRIBUTE_NAME)){
					domClass.add(children[i], "view");
					domClass.add(children[i], "mblBackground");
				} 
			}
			
			var basicStyle = "#"+this.ID+">.view{display:none;} \n" +
							 "#"+this.ID+" #slider {width:"+100*(this._maxPanes+1)+"%} \n" +
							 "#"+this.ID+" #slider .view {width:"+100/(this._maxPanes+1)+"%;} \n";
			domConstruct.place("<style>" + basicStyle + "</style>", win.body(), "first");
			
			// Construct needed markup
			this._multiPanes = domConstruct.place("<div id='multiPanes'></div>", this.domNode, "first");
			this._MPslider = domConstruct.place("<div id='slider'></div>", this._multiPanes, "first");
			this._MPstyle = domConstruct.place("<style></style>", this.domNode, "first");
			this._MPanimation = domConstruct.place("<style></style>", this.domNode, "first");
			
			// Add listeners
			on(this._MPslider, "webkitTransitionEnd", lang.hitch(this, "MPtransitionendHandler"));
			// dojoDisplay event should have a detail.view string property containing the id of the view to display
			on(this.domNode, "dojoDisplay", lang.hitch(this, "display"));
			
			// Load default
			on.emit(this.domNode,"dojoDisplay",{bubbles: true, cancelable: true, detail: {viewId: this.mainView}});
			this.resize();
		},
		
		
		display: function(e){
			var viewId = e.detail.viewId;
			if (!viewId){return;}
			var viewDomNode = dom.byId(viewId);
			if (!viewDomNode){return;}
			
			var type = viewDomNode.dataset.dojoView; /* String: multiPane FIXME should be dependant of VIEW_ATTRIBUTE_NAME */
			
			var style = this._MPstyle.innerHTML;
			var animation = this._MPanimation.innerHTML;
			
			if (type === "multiPanes"){
				//get view depth
				var depth = parseInt(viewDomNode.dataset.dojoDepth,10);
				
				//view already displayed at current depth so just update the view
				if (this._currentDepth === depth && this._MPdepths[depth] !== viewId){
					this._MPslider.appendChild(viewDomNode);
					/*domConstruct.place(dom.byId(this._MPdepths[this._currentDepth]), this.domNode, "last");*/
					transit(dom.byId(this._MPdepths[this._currentDepth]), viewDomNode, {transition:"slide"})
					this._MPdepths[depth] = viewId;
				} else if (this._currentDepth === (depth-1)){ //add a new depth level 
					this._currentDepth++;
					this._MPdepths.push(viewId); 
					this._MPslider.appendChild(viewDomNode);
					
					if (this._currentDepth > this._maxPanes){ //Slide transition
						style = "#"+this.ID+" #slider {" +
								"	width: " + (100*(this._maxPanes+1)/this._maxPanes) + "%;" +
								"}";
						animation = "#"+this.ID+" #slider {" +
								"	-webkit-transform: translateX(-" + 100/(this._maxPanes+1) + "%);" +
								"	-webkit-transition: -webkit-transform "+this.ANIMATION_DURATION+" ease;" +
								"}";								
					} else { // Compression transition
						style = "#"+this.ID+" #slider{" +
								"	width: " + (100*(this._maxPanes+1)/this._currentDepth) + "%;" +
								"}";
						animation = "#"+this.ID+" #slider {" +
								"	-webkit-transition: width "+this.ANIMATION_DURATION+" ease;" +
								"}";
					}
					
				} else { // this._currentDepth > depth //FIXME c'est pas ca la condition
					//TODO retour en arriere animation
					var step = this._currentDepth - depth;
					for (var i = 0; i <= step; i++){
						domConstruct.place(dom.byId(this._MPdepths.pop()), this.domNode, "last");
					}
					this._MPdepths[depth] = viewId;
					for (var j = depth; j > depth-this._maxPanes && j > 0; j-- ){
						domConstruct.place(dom.byId(this._MPdepths[j]), this._MPslider, "first");
					}
					
					
					this._currentDepth = depth;
					if (this._currentDepth > this._maxPanes){ //Slide transition
						style = "#"+this.ID+" #slider {" +
								"	width: " + (100*(this._maxPanes+1)/this._maxPanes) + "%;" +
								"}";
					/*	animation = "#"+this.ID+" #slider {" +
								"	-webkit-transform: translateX(-" + 100/(this._maxPanes+1) + "%);" +
								"	-webkit-transition: -webkit-transform "+this.ANIMATION_DURATION+" ease;" +
								"}"; */					
					} else { // expansion transition
						style = "#"+this.ID+" #slider{" +
								"	width: " + (100*(this._maxPanes+1)/this._currentDepth) + "%;" +
								"}";
						animation="";		// stop any animation currently active
						/*animation = "#"+this.ID+" #slider {" +
								"	-webkit-transition: width "+this.ANIMATION_DURATION+" ease;" +
								"}";*/
					}
				}
		
				this.defer(function(){
					this._MPanimation.innerHTML = animation;
					this._MPstyle.innerHTML = style;	
				},0);
			
			}
		},
		
		MPtransitionendHandler: function(e /*event*/){
			if (e.target.id === "slider" && e.propertyName === "-webkit-transform"){ //Slide transition
				domConstruct.place(query("#slider>.view:first-child")[0], this.domNode, "last");
			}
			this._MPanimation.innerHTML = "";	
		},
		
		resize: function(){
			this.inherited(arguments);
			win.body().style.height= (win.global.innerHeight || win.doc.documentElement.clientHeight)+"px";
		}
	});
});