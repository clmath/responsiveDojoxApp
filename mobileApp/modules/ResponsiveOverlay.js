define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/on",
	"dojox/mobile/Icon",
	"dojox/mobile/viewRegistry"
], function(arrayUtil, declare, _Contained, _Container, _WidgetBase, domClass, domConstruct, domAttr, on, Icon, viewRegistry){

	// module:
	//		my/ResponsiveOverlay

	return declare([_WidgetBase, _Contained, _Container], {
		// parameters
		
		visible: false,
		
		// region: [const] String
		//		Region of pane associated with this splitter.
		//		"top", "bottom", "left", "right", "leading", "trailing".
		region: "leading",  
							
		_setVisibleAttr: function(/*Boolean*/ visible){
			this._set("visible", visible);
			if (this.visible){
				this._show();
			} else {
				this._hide();
			}
		},
		
		_show: function(){
			this.domNode.style.display = "block";
		},
		
		_hide: function(){
			this.domNode.style.display = "none";
		},
			
		postMixInProperties: function(){
			this.inherited(arguments);
	
			var ltr = this.isLeftToRight();
			if(this.region == "leading"){
				this.region = ltr ? "left" : "right";
			}
			if(this.region == "trailing"){
				this.region = ltr ? "right" : "left";
			}
		},
		
		postCreate: function(){
			this.inherited(arguments);
			
			domClass.add(this.domNode,"mblResponsiveOverlay mblResponsiveOverlay_"+this.region);
			
			var closeIcon = new Icon({icon: "mblDomButtonBlackCircleCross", alt: "Close"})
			closeIcon.domNode.style.float = this.isLeftToRight() ? "right" : "left";
			domConstruct.place(closeIcon.domNode, this.domNode, "first");
		
			var that = this;
			on(closeIcon.domNode, "click", function(){that.getParent().hideOverlay();});
		}
	});
});
