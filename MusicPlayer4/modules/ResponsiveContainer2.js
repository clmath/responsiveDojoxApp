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
		
		VIEW_ATTRIBUTE_NAME: "dojo-view",
		VIEW_JS_NAME: "dojoView",
		
		// MultiPanes variables
		_multiPanes: null,
		_MPslider: null,
		_maxPanes: 3,
		_currentDepth: 0,
		_MPdepths: ["root"], //dummy element to start the index at 1 //FIXME pointer to domNode instead of string ?
		
		_MPColCls: [],
		_MQDiv: null,
		
		mainView: "view1",
		
		startup: function(){
			this.inherited(arguments);
				
			// Applying the view class on the views
			var children = this.domNode.childNodes;
			var i;
			for (i=0; i < children.length; i++){
				if (domAttr.has(children[i], "data-"+this.VIEW_ATTRIBUTE_NAME)){
					domClass.add(children[i], "view viewFrame");
					domClass.add(children[i], "mblBackground");
				} 
			}
			
			for (i=1; i<=this._maxPanes; i++){this._MPColCls.push("col"+i)}
			
			// Construct needed markup
			this._multiPanes = domConstruct.place("<div id='multiPanes'></div>", this.domNode, "first");
			this._MPslider = domConstruct.place("<div id='slider'></div>", this._multiPanes, "first");
			this._MQDiv = domConstruct.place("<div id='MQmatch'></div>", this.domNode, "first");
			
			// dojoDisplay event should have a detail.view string property containing the id of the view to display
			this.on("dojoDisplay", lang.hitch(this, "display"));
			
			// Load default
			on.emit(this.domNode,"dojoDisplay",{bubbles: true, cancelable: true, detail: {viewId: this.mainView}});
			this.resize();
		},
		
		_getCurrentMaxPanes: function(){
			switch (this._MQDiv.offsetWidth){
				case 1: return this._maxPanes; break;
				case 2: return Math.min(this._maxPanes, 2); break;
				case 3: return Math.min(this._maxPanes, 1); break;
			}
		},
		
		display: function(e){
			var viewId = e.detail.viewId;
			if (!viewId){return;}
			var viewDomNode = dom.byId(viewId);
			if (!viewDomNode){return;}
			
			var type = viewDomNode.dataset[this.VIEW_JS_NAME]; /* String: multiPane*/
			
			if (type === "multiPanes"){
				//get view depth
				var depth = parseInt(viewDomNode.dataset.dojoDepth,10);
				//get current maxPanes
				var currentMaxPanes = this._getCurrentMaxPanes();
				
				//a view is already displayed at current depth so just update the view
				if (this._currentDepth === depth && this._MPdepths[depth] !== viewId){
					this._MPslider.appendChild(viewDomNode);
					this._inPlaceTransition(viewDomNode);
					this._MPdepths[depth] = viewId;			
				
				} else if (this._currentDepth === (depth-1)){ //add a new depth level 
					this._currentDepth++;
					this._MPdepths.push(viewId); 
					this._MPslider.appendChild(viewDomNode);
						
					//TODO optional transition					
					if (this._currentDepth > currentMaxPanes){ //Slide transition
						domClass.add(this._MPslider, "col"+Math.min(this._maxPanes,this._currentDepth));
						this._slideTransition();
					} else { // Compression transition
						this._widthTransition(); //the transition is listening for the new class colX
						domClass.add(this._MPslider, "col"+this._currentDepth);//  this._MPColCls);
						//domClass.replace(this._MPslider, "col"+this._currentDepth, "col"+(this._currentDepth-1));//  this._MPColCls);
						//this.defer(function(){domClass.replace(this._MPslider, "col"+this._currentDepth,  "col"+(this._currentDepth-1));}); Workaroud first transition
					}		
							
				} else if (this._currentDepth > depth){ 
					var step = this._currentDepth - depth;
					for (var i = 0; i <= step; i++){
						domConstruct.place(dom.byId(this._MPdepths.pop()), this.domNode, "last");
					}
					this._MPdepths[depth] = viewId;
					for (var j = depth; j > depth-this._maxPanes && j > 0; j-- ){
						domConstruct.place(dom.byId(this._MPdepths[j]), this._MPslider, "first");
					}
					this._currentDepth = depth;
	
					if (this._currentDepth > currentMaxPanes){ //Slide transition
						//TODO transition ?
					} else { // expansion transition
						//domClass.replace(this._MPslider, "col"+this._currentDepth, "col"+(this._currentDepth+1));// this._MPColCls);
						domClass.remove(this._MPslider, "col"+(this._currentDepth+1));// this._MPColCls);
					}
				}//TODO what if this._currentDepth < depth-1 ie we add more than one depth level
			}
		},
		
		_rewindTransition: function(viewDomNode, transition){
			
		},

		_inPlaceTransition: function(viewDomNode, transition){ //XXX the code could be cleaner
			var div = domConstruct.toDom("<div class='viewFrame' style='overflow: hidden;'></div>");
			var slider = domConstruct.toDom("<div style='width: 200%;height: 100%;'></div>");
			var oldNode = this._MPslider.replaceChild(div, dom.byId(this._MPdepths[this._currentDepth]));
			div.appendChild(slider);
			slider.appendChild(oldNode);
			slider.appendChild(viewDomNode);
			oldNode.style.width="50%";
			viewDomNode.style.width="50%";
			this.defer(function(){	domClass.add(oldNode, "mblSlide mblOut mblTransition");
									domClass.add(viewDomNode, "mblSlide mblOut mblTransition");});
			
			var signal = on(slider, "webkitTransitionEnd", lang.hitch(this, function(e){
				var children = e.currentTarget.childNodes;
				var parent = e.currentTarget.parentNode;
				if(children.length != 2){return;} //FIXME should return an error
				for(var i = 0; i < 2; i++){
					domClass.remove(children[i], "mblSlide mblOut mblTransition");
					children[i].style.removeProperty("width");
				}
				domConstruct.place(children[0], this.domNode, "last"); //FIXME should happen every time even if the transition fail or is disabled
				this._MPslider.replaceChild(children[0], parent); //still index 0 because children is a dynamic list 
				signal.remove();
			}));
		},
		
		// TODO function Apply transition that return a function | callback after
		_slideTransition: function(){
			domClass.add(this._MPslider, "slideTransition");
			var signal = on(this._MPslider, "webkitTransitionEnd", lang.hitch(this, function(){
				domClass.remove(this._MPslider, "slideTransition");
				if(this._MPslider.childNodes.length > this._maxPanes){
					domConstruct.place(query("#slider>.view:first-child")[0], this.domNode, "last"); //FIXME should happen every time even if the transition fail or is disabled
				}
				signal.remove();
			}));
		},	
		
		_widthTransition: function(){
			domClass.add(this._MPslider, "widthTransition");
			var signal = on(this._MPslider, "webkitTransitionEnd", lang.hitch(this, function(){
				domClass.remove(this._MPslider, "widthTransition");
				signal.remove();
			}));
		},
		
		resize: function(){
			this.inherited(arguments);
			win.body().style.height= (win.global.innerHeight || win.doc.documentElement.clientHeight)+"px";
		}
		
		/*MPtransitionendHandler: function(e /*event/){
			if (e.target.id === "slider" && e.propertyName === "-webkit-transform"){ //Slide transition
				domConstruct.place(query("#slider>.view:first-child")[0], this.domNode, "last");
			}
			this._MPanimation.innerHTML = "";	
		},*/
		
	});
});