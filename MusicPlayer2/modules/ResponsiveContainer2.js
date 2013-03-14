define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/window",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/dom-class"
], function(declare, arrayUtil, win, _Container, _WidgetBase, dom, domConstruct, domAttr, domClass){

	// module:
	//		my/ResponsiveContainer
	
	return declare([_WidgetBase, _Container], {
		
		VIEW_ATTRIBUTE_NAME: "data-dojo-view",
		_content: null,
		_slider: null,
		_style: null,
		_maxPanes: 3,
		_dynamicPanes: true,
		_depth: {},
		_visibleDepths: 0, // [0..maxPanes]
		_currentDepth: 0,
		
		maxDepth:0,
		mainView: "view1",
		
		startup: function(){
			this.inherited(arguments);
			
			domConstruct.place("<style>#"+this.domNode.id+">.view{display:none;}</style>", win.body(), "first");
			
			var children = this.domNode.children;
			for (var i=0; i < children.length; i++){
				if (domAttr.has(children[i], this.VIEW_ATTRIBUTE_NAME)){
					domClass.add(children[i], "view");
				} 
			}
			
			this._content = domConstruct.place("<div id='content'></div>", this.domNode, "first");
			this._slider = domConstruct.place("<div id='slider'></div>", this._content, "first");
			this._style = domConstruct.place("<style></style>", this.domNode, "first");
			
			this.display(this.mainView, "content");
			this.resize();
		},
		
		display: function(view, /* String: content|overlay */ pane){
			var viewWidth;
			var offsetX =0;
			
			if(pane === "content"){
				this._currentDepth++;
				this._slider.appendChild(dom.byId(view));
				
				viewWidth = 100/Math.min(this._currentDepth,this._maxPanes); //desired visible view width
				if (this._currentDepth > this._maxPanes){
					offsetX = this._currentDepth-this._maxPanes;
				}
				
				this._style.innerHTML = "#slider {" +
										"	width: " + (this._currentDepth+1)*viewWidth + "%;" + //+1 to extend the div and have the space to add the next child
										"	-webkit-transform: translate3d(-" + 100/(this._currentDepth+1)*offsetX + "%,0,0);" +
										"}" +
										"#slider .view {" +
										"	width: " + 100/(this._currentDepth+1) + "%" + // actual view width in the slider container
										"}"+
										
										"@media (max-width: 800px) and (min-width: 401px) {" + 
										"	#slider {" + 
										"		-webkit-transform: translate3d(-" + 100/(this._currentDepth+1)*(this._currentDepth-2) + "%,0,0);" +
										"		width: " + (this._currentDepth+1)*100/Math.min(this._currentDepth,2) + "%" + //+1 for the hidden view
										"	}"+
										"}" +
										
										"@media (max-width: 400px) {" +
										"	#slider {" + 
										"		-webkit-transform: translate3d(-" + 100/(this._currentDepth+1)*(this._currentDepth-1) + "%,0,0);" +
										"		width: " + (this._currentDepth+1)*100 + "%" + //+1 for the hidden view
										"	}"+
										"}";
			}
		},
		
		resize: function(){
			this.inherited(arguments);
			win.body().style.height= (win.global.innerHeight || win.doc.documentElement.clientHeight)+"px";
		}
	});
});