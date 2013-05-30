define([
	"dojo/_base/declare",
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
	"dojo/sniff",
	"dojox/mobile/viewRegistry"//, To hack views
	//"dojox/gesture/swipe"
], function(declare, win, _Container, _WidgetBase, dom, domConstruct, domAttr, domClass, on, lang, query, has, vreg/*, swipe*/){

	// module:
	//		my/ResponsiveContainer
	
	var capture = function(target, type, listener){
		if(target.addEventListener){
			target.addEventListener(type, listener, true);
			// create and return the signal
			return {
				remove: function(){
					target.removeEventListener(type, listener, true);
				}
			};
		}
	};	
		
	// Wrap node into element
	var wrap = function(element, node){ 
		var newNode = domConstruct.create(element);
		node.parentNode.replaceChild(newNode,node);
		newNode.appendChild(node);
		return newNode;
	};
	
	return declare([_WidgetBase, _Container], {
		
		VIEW_ATTRIBUTE_NAME: "dojo-view",
		DEPTH_ATTRIBUTE_NAME: "dojo-depth",
		
		// MultiPanes variables
		_multiPanes: null,
		_MPheader: null,
		_MPslider: null,
		_MPmaxPanes: 3,
		_MPcurrentDepth: 0,
		_MPdepths: ["root"], //dummy element to start the index at 1
		
		// SidePane 
		_sidePane: {
			domNode: null,
			visible: false,
			side: "", // Meaningful iff visible === true
			viewId: ""
		},
		
		// Transition
		_cbMap: null,
		
		// Media Queries
		_MQDiv: null, // Workaround for window.matchMedia
		
		
		mainView: "view1",
		
		startup: function(){
			this.inherited(arguments);
				
			// Applying the view class on the views
			var children = this.domNode.children;
			var i;
			for(i=0; i < children.length; i++){
				if(domAttr.has(children[i], "data-"+this.VIEW_ATTRIBUTE_NAME)){
					domClass.add(children[i], "view");
					domClass.add(children[i], "mblBackground");
				}else if(children[i].nodeName === "H1"){
					this._MPheader = children[i];
				}
			}
			
			// Setting up the callback map
			this._cbMap = {inPlaceTransition: {status: false, start: lang.hitch(this, this._inPlaceTransition), end: lang.hitch(this, this._inPlaceTransitionEnd)}, //status = true while there is an ongoing transition 
							slideTransition: {status: false, start: lang.hitch(this, this._baseTransition), end: lang.hitch(this, this._slideTransitionEnd)},
							widthTransition: {status: false, start: lang.hitch(this, this._baseTransition), end: lang.hitch(this, this._baseTransitionEnd)},
							sideTransition: {status: false, start: lang.hitch(this, this._baseTransition), end: lang.hitch(this, this._baseTransitionEnd)},
							sideSlideTransition: {status: false, start: lang.hitch(this, this._sideSlideTransition), end: lang.hitch(this, this._sideSlideTransitionEnd)},
							shake: {status: false, start: lang.hitch(this, this._baseTransition), end: lang.hitch(this, this._baseTransitionEnd)}};
			
			// Construct needed markup
			this._sidePane.domNode = domConstruct.place("<div id='sidePane'></div>", this.domNode, "first");
			this._multiPanes = domConstruct.place("<div id='multiPanes'></div>", this.domNode, "first");
			this._MPslider = domConstruct.place("<div id='slider'></div>", this._multiPanes, "first");
			this._MQDiv = domConstruct.place("<div id='MQmatch'></div>", this._multiPanes, "first");

			if(this._MPheader){
				domConstruct.place(this._MPheader, this._multiPanes, "first");
				this._MPslider.style.marginTop="-"+this._MPheader.offsetHeight+"px";
				this._MPslider.style.paddingTop=""+this._MPheader.offsetHeight+"px";
			}
			
			// dojoDisplay event should have a detail.view string property containing the id of the view to display
			on(win.body(), "dojodisplay", lang.hitch(this, "display"));
			
			// Load default
			this.emit("dojodisplay", {bubbles: true, cancelable: true, detail: {viewId: this.mainView}});
			console.log("ok");
			
			
			/////////////////////////////////////
			//swipe.end(this.domNode, function(e){alert(e.type+" "+e.time+"ms "+e.dx+"px "+e.dy+"px");})
		},
		
		_getCurrentMaxPanes: function(){
			switch(this._MQDiv.offsetWidth){
				case 1: return this._MPmaxPanes; break;
				case 2: return Math.min(this._MPmaxPanes, 2); break;
				case 3: return Math.min(this._MPmaxPanes, 1); break;
			}
		},
		
		_getSideTransition: function(){
			switch(this._MQDiv.offsetHeight){
				case 1: return "under"; break;
				case 2: return "over"; break;
			}
		},
		
		_isInSidePane: function(domNode){
			while(domNode !== null && domNode !== undefined && domNode !== this._sidePane.domNode){
				domNode = domNode.parentNode;	
			}
			return (domNode !== null) ? true : false; 
		},
		
		display: function(e){
			var viewId = e.detail.viewId;
			if(!viewId){return;}
			var animate = e.detail.animate || false;
			var viewDomNode = dom.byId(viewId);
			if(!viewDomNode){return;}
			
			//to hack the view widget startup display: none and the event handler
			viewDomNode.style.display = "";
			vreg.getEnclosingView(viewDomNode)._transEndHandle.remove();
			vreg.getEnclosingView(viewDomNode)._animEndHandle.remove();
			vreg.getEnclosingView(viewDomNode)._animStartHandle.remove();
			
			var type = domAttr.get(viewDomNode, "data-"+this.VIEW_ATTRIBUTE_NAME).split(" "); /* String: multiPane | sidePane left | sidePane right*/
			
			this._clearTransition();
			if(type[0] === "multiPanes"){
				//get view depth
				var depth = parseInt(domAttr.get(viewDomNode, "data-"+this.DEPTH_ATTRIBUTE_NAME),10);
				//get current maxPanes
				var currentMaxPanes = this._getCurrentMaxPanes();
				
				//The view is already display so we shake it so the user can see it
				if(depth === this._MPcurrentDepth && viewId === this._MPdepths[depth]){
					this._startTransition(viewDomNode, "shake");
			
				}else if(depth === this._MPcurrentDepth && viewId !== this._MPdepths[depth]){ //a view is already displayed at current depth so just update the view
					if(animate){
						this._startTransition(viewDomNode, "inPlaceTransition", {oldNode: dom.byId(this._MPdepths[this._MPcurrentDepth])});
					}else{
						this._MPslider.appendChild(viewDomNode);
						domConstruct.place(this._MPdepths[this._MPcurrentDepth], this.domNode, "last"); 
					}
					this._MPdepths[depth] = viewId;			
		
				}else if(this._MPcurrentDepth === (depth-1)){ //add a new depth level 
					this._MPcurrentDepth++;
					this._MPdepths.push(viewId); 
					this._MPslider.appendChild(viewDomNode);
						
					//Slide transition
					if(animate && (this._MPcurrentDepth > currentMaxPanes)){
						this._startTransition(this._MPslider, "slideTransition");
					}else if(this._MPcurrentDepth > currentMaxPanes){
						this._cbMap["slideTransition"].end(this._MPslider, "slideTransition");
					}
					// Compression transition
					if(animate && (this._MPcurrentDepth <= currentMaxPanes)){ 
						this._startTransition(this._MPslider, "widthTransition"); //the transition is listening for the new class colX
					}
					
					domClass.add(this._MPslider, "col"+Math.min(this._MPmaxPanes,this._MPcurrentDepth));
		
				}else if(this._MPcurrentDepth > depth){ //remove depth level
					var step = this._MPcurrentDepth - depth;
					var i = 0;
					for(i = 0; i <= step; i++){
						domConstruct.place(dom.byId(this._MPdepths.pop()), this.domNode, "last");
					}
					this._MPdepths[depth] = viewId;
					for(i = depth; i > (depth-this._MPmaxPanes) && i > 0; i-- ){
						domConstruct.place(dom.byId(this._MPdepths[i]), this._MPslider, "first");
					}
					this._MPcurrentDepth = depth;
					
					if(animate && (this._MPcurrentDepth <= currentMaxPanes)){ // expansion transition
						this._startTransition(this._MPslider, "widthTransition"); //the transition is listening for the new class colX
					}
					
					for(i = this._MPmaxPanes; i > this._MPcurrentDepth; i--){
						domClass.remove(this._MPslider, "col"+i);
					}
				}
			}else if(type[0] === "sidePane"){
				var side = type[1] || "left";
				if(!this._sidePane.visible){
					this._sidePane.visible = true;
					this._sidePane.domNode.appendChild(viewDomNode);
					this._sidePane.domNode.style.display = "block";
					
					if(animate && this._getSideTransition() === "under"){
						this._startTransition(this._multiPanes, "sideTransition");
					}else if(animate && this._getSideTransition() === "over"){
						this._startTransition(this._sidePane.domNode, "sideSlideTransition");
					}
					
					domClass.add(this._sidePane.domNode, side);
					domClass.add(this._multiPanes, "overlayed "+side);
					
					var eventName = has("touch") ? "touchstart" : "mousedown"; //Those are the event used by dojo so we have to use them if we went to prevent the default action
					var handler = capture(win.body(), eventName, lang.hitch(this, function(event){
																					if(!this._isInSidePane(event.target||event.srcElement)){
																						event.stopPropagation();
																						handler.remove();
																						this._hideSidePane();
																					}}));
					
				}else if(this._sidePane.side !== side){ // we need to open the overlay on the other side
					this._hideSidePane();
					this.emit("dojodisplay", {bubbles: true, cancelable: true, detail: {viewId: viewId}});
				}else if(viewId !== this._sidePane.viewId){ //sidePane.visible === true
					this._startTransition(viewDomNode, "inPlaceTransition", {oldNode: dom.byId(this._sidePane.viewId)});
				} 
				this._sidePane.viewId = viewId;
				this._sidePane.side = side;
			}
		},
		
		_hideSidePane: function(){
			this._clearTransition();
			this._sidePane.visible = false;
			this._sidePane.domNode.style.display = "none";
			domClass.remove(this._sidePane.domNode, this._sidePane.side);
			domClass.remove(this._multiPanes, "overlayed "+this._sidePane.side);
			domConstruct.place(this._sidePane.domNode.children[0], this.domNode, "last");
		},
		
		_clearTransition: function(){
			var trans;
			for(trans in this._cbMap){
				if(this._cbMap[trans].status === true){
					this._endTransition(this._cbMap[trans]._node, trans);
				}
			}
		},

		_startTransition: function(node, transition, option){
			var eventName;
			eventName = has("webkit") ? "webkitTransitionEnd" : "transitionend";

			this._cbMap[transition].status = true;
			this._cbMap[transition]._node = node;
			on.once(node, eventName, lang.hitch(this,function(event){this._endTransition(node, transition, option);}));
			if(this._cbMap[transition].start){
				this._cbMap[transition].start(node, transition, option);
			}
		},

		_endTransition: function(node, transition, option){
			this._cbMap[transition].status = false;
			if(this._cbMap[transition].end){
				this._cbMap[transition].end(node, transition, option);
			}
		},

		_baseTransition: function(node, transition){
			domClass.add(node, transition);
		},

		_baseTransitionEnd: function(node, transition){
			domClass.remove(node, transition);			
		},
				
		_inPlaceTransition: function(node, transition, option){
			var oldNode = option.oldNode;
			var frameWidth = oldNode.offsetWidth+"px";
			var slider = wrap("div", oldNode);
			var frame = wrap("div", slider);
			
			slider.style.width = "200%"; 
			slider.style.height = "100%";
			domClass.add(slider,"tmpPrivateDiv"); // Mark the div to remove it and not another one
			slider.appendChild(node);
			
			
			//frame.style.boxSizing = "border-box";
			frame.style.width = frameWidth; 
			frame.style.height = "100%";
			frame.style.overflow = "hidden";
			domClass.add(frame, "tmpPrivateDiv"); // Mark the div to remove it and not another one
			//frame.style.border = "solid black";
			//frame.style.borderWidth = "0px 1px";
			
		
			oldNode.style.width="50%";
			node.style.width="50%";
			
			domClass.add(oldNode, "mblSlide mblOut");
			domClass.add(node, "mblSlide mblOut");
			
			this.defer(function(){	domClass.add(oldNode, "mblTransition");
									domClass.add(node, "mblTransition");}, 100);
		},
		
		_inPlaceTransitionEnd: function(node, transition){
			var i;
			var children = node.parentNode.children;
			var parent = node.parentNode.parentNode;
			if(children.length != 2 || !(domClass.contains(node.parentNode, "tmpPrivateDiv")) || !(domClass.contains(parent, "tmpPrivateDiv"))){
				console.log("In place transition run into an unexpected error");
				return;
			}
			for(i = 0; i < 2; i++){
				domClass.remove(children[i], "mblSlide mblOut mblTransition");
				children[i].style.removeProperty("width");
			}
			domConstruct.place(children[0], this.domNode, "last"); 
			parent.parentNode.replaceChild(children[0], parent); //still index 0 because children is a dynamic list 
		},
		
		_sideSlideTransition: function(node, transition){
			domClass.add(node, "beforeSideSlide");
			this.defer(function(){domClass.add(node, "sideSlideTransition")});
		},
		
		_sideSlideTransitionEnd: function(node, transition){
			domClass.remove(node, "beforeSideSlide");
			domClass.remove(node, "sideSlideTransition");
		},

		_slideTransitionEnd: function(node, transition){
			this._baseTransitionEnd(node, transition);
			if(this._MPslider.children.length > this._MPmaxPanes){
				domConstruct.place(query("#slider>.view:first-child")[0], this.domNode, "last"); 
			}
		}
	});
});