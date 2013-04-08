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
	"dojo/query"
], function(declare, win, _Container, _WidgetBase, dom, domConstruct, domAttr, domClass, on, lang, query) {

	// module:
	//		my/ResponsiveContainer
	
	return declare([_WidgetBase, _Container], {
		
		VIEW_ATTRIBUTE_NAME: "dojo-view",
		VIEW_JS_NAME: "dojoView",
		
		// MultiPanes variables
		_multiPanes: null,
		_MPslider: null,
		_MPmaxPanes: 3,
		_MPcurrentDepth: 0,
		_MPdepths: ["root"], //dummy element to start the index at 1 
		_cbMap: null,
		_transitionEndListener: null,
		
		_MQDiv: null, // Workaround for window.matchMedia
		
		mainView: "view1",
		
		startup: function(){
			this.inherited(arguments);
				
			// Applying the view class on the views
			var children = this.domNode.childNodes;
			var i;
			for (i=0; i < children.length; i++){
				if (domAttr.has(children[i], "data-"+this.VIEW_ATTRIBUTE_NAME)){
					domClass.add(children[i], "viewFrame view");
					domClass.add(children[i], "mblBackground");
				} 
			}
			
			// Setting up the callback map
			this._cbMap = {inPlaceTransition: {status: false, start: lang.hitch(this, this._inPlaceTransition), end: lang.hitch(this, this._inPlaceTransitionEnd)}, //status = true while there is an ongoing transition 
							slideTransition: {status: false, start: lang.hitch(this, this._forwardTransition), end: lang.hitch(this, this._slideTransitionEnd)},
							widthTransition: {status: false, start: lang.hitch(this, this._forwardTransition), end: lang.hitch(this, this._forwardTransitionEnd)}};
			
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
				case 1: return this._MPmaxPanes; break;
				case 2: return Math.min(this._MPmaxPanes, 2); break;
				case 3: return Math.min(this._MPmaxPanes, 1); break;
			}
		},
		
		display: function(e){
			var viewId = e.detail.viewId;
			if (!viewId){return;}
			var animate = e.detail.animate || false;
			var viewDomNode = dom.byId(viewId);
			if (!viewDomNode){return;}
			
			var type = viewDomNode.dataset[this.VIEW_JS_NAME]; /* String: multiPane*/
			
			this._clearTransition();
			if (type === "multiPanes"){
				//get view depth
				var depth = parseInt(viewDomNode.dataset.dojoDepth,10);
				//get current maxPanes
				var currentMaxPanes = this._getCurrentMaxPanes();
				
				//a view is already displayed at current depth so just update the view
				if (this._MPcurrentDepth === depth && this._MPdepths[depth] !== viewId){
					if(animate){
						this._startTransition(viewDomNode, "inPlaceTransition");
					} else{
						this._MPslider.appendChild(viewDomNode);
						domConstruct.place(this._MPdepths[this._MPcurrentDepth], this.domNode, "last"); 
					}
					this._MPdepths[depth] = viewId;			
		
				} else if (this._MPcurrentDepth === (depth-1)){ //add a new depth level 
					this._MPcurrentDepth++;
					this._MPdepths.push(viewId); 
					this._MPslider.appendChild(viewDomNode);
						
					//Slide transition
					if (animate && (this._MPcurrentDepth > currentMaxPanes)){
						this._startTransition(this._MPslider, "slideTransition");
					} else if (this._MPcurrentDepth > currentMaxPanes) {
						this._cbMap["slideTransition"].end(this._MPslider, "slideTransition");
					}
					// Compression transition
					if (animate && (this._MPcurrentDepth <= currentMaxPanes)){ 
						this._startTransition(this._MPslider, "widthTransition"); //the transition is listening for the new class colX
					}
					
					domClass.add(this._MPslider, "col"+Math.min(this._MPmaxPanes,this._MPcurrentDepth));
		
				} else if (this._MPcurrentDepth > depth){ //remove depth level
					var step = this._MPcurrentDepth - depth;
					var i = 0;
					for (i = 0; i <= step; i++){
						domConstruct.place(dom.byId(this._MPdepths.pop()), this.domNode, "last");
					}
					this._MPdepths[depth] = viewId;
					for (i = depth; i > (depth-this._MPmaxPanes) && i > 0; i-- ){
						domConstruct.place(dom.byId(this._MPdepths[i]), this._MPslider, "first");
					}
					this._MPcurrentDepth = depth;
					
					if (animate && (this._MPcurrentDepth <= currentMaxPanes)){ // expansion transition
						this._startTransition(this._MPslider, "widthTransition"); //the transition is listening for the new class colX
					}
					
					for (i = this._MPmaxPanes; i > this._MPcurrentDepth; i--){
						domClass.remove(this._MPslider, "col"+i);
					}
				}
			}
		},
		
		_clearTransition: function(){
			var trans;
			for (trans in this._cbMap){
				if (this._cbMap[trans].status === true){
					this._endTransition(this._cbMap[trans]._node, trans);
				}
			}
		},

		_startTransition: function(node, transition){
			this._cbMap[transition].status = true;
			this._cbMap[transition]._node = node;
			this._transitionEndListener = on(this._MPslider, "webkitTransitionEnd", lang.hitch(this,function(){this._endTransition(node, transition);}));
			if (this._cbMap[transition].start){
				this._cbMap[transition].start(node, transition);
			}
		},
		
		_endTransition: function(node, transition){
			this._cbMap[transition].status = false;
			this._transitionEndListener.remove();
			if (this._cbMap[transition].end){
				this._cbMap[transition].end(node, transition);
			}
		},
		
		_inPlaceTransition: function(node, transition){
			var oldNode = dom.byId(this._MPdepths[this._MPcurrentDepth]);
			var slider = this._wrap("div", oldNode);
			var frame = this._wrap("div", slider);
			
			slider.style.width = "200%"; 
			slider.style.height = "100%"; 
			slider.appendChild(node);
			
			domClass.add(frame, "viewFrame"); 
		
			oldNode.style.width="50%";
			node.style.width="50%";
			
			this.defer(function(){	domClass.add(oldNode, "mblSlide mblOut mblTransition");
									domClass.add(node, "mblSlide mblOut mblTransition");});
		},
		
		_inPlaceTransitionEnd: function(node, transition){
			var i;
			var children = node.parentNode.childNodes;
			var parent = node.parentNode.parentNode;
			if(children.length != 2){console.log("In place transition run into an unexpected error"); return;}
			for(i = 0; i < 2; i++){
				domClass.remove(children[i], "mblSlide mblOut mblTransition");
				children[i].style.removeProperty("width");
			}
			domConstruct.place(children[0], this.domNode, "last"); 
			this._MPslider.replaceChild(children[0], parent); //still index 0 because children is a dynamic list 
		}, 
		
		_forwardTransition: function(node, transition){
			domClass.add(node, transition);
		},
		
		_forwardTransitionEnd: function(node, transition){
			domClass.remove(node, transition);			
		},
		
		_slideTransitionEnd: function(node, transition){
			this._forwardTransitionEnd(node, transition);
			if(this._MPslider.childNodes.length > this._MPmaxPanes){
				domConstruct.place(query("#slider>.view:first-child")[0], this.domNode, "last"); 
			}
		},	
		
		// Wrap node into element
		_wrap: function(element, node){ 
			var newNode = domConstruct.create(element);
			node.parentNode.replaceChild(newNode,node);
			newNode.appendChild(node);
			return newNode;
		},
		
		resize: function(){
			this.inherited(arguments);
			win.body().style.height= (win.global.innerHeight || win.doc.documentElement.clientHeight)+"px";
		}
	});
});