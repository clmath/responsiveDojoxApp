define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojo/dom-class"
], function(declare, arrayUtil, _Container, _WidgetBase, domClass){

	// module:
	//		my/ResponsiveContainer

	return declare([_WidgetBase, _Container], {
		
		// _overlay: [private] ResponsiveOverlay
		// 				pointer to the contained overlay widget
		_overlay: null,
		
		// _content: [private] ResponsiveContent
		//				pointer to the content div			
		_content: null,
		
		
		isOverlayVisible: false,
		
		showOverlay: function(){
			if(this._overlay){
				this._overlay.set("visible", true);

				if(this._content){
					this._content.minimize(this._overlay.region);
				}
			}
			
			this.isOverlayVisible = true;
		},
		
		hideOverlay: function(){
			if(this._overlay){
				this._overlay.set("visible", false);

				if(this._content){
					this._content.maximize(this._overlay.region);
				}
			}
			
			this.isOverlayVisible = false;
		},
		
		//addChild()
		
		//addOverlay()
		
		startup: function(){
			this.inherited(arguments);
			
			var children = this.getChildren();
			if (children.length > 2){
				throw new Error("Too many children for ResponsiveContainer.");
			}
			
			arrayUtil.map(children, function(item, index){
				if (domClass.contains(item.domNode, "mblResponsiveContent")){
					this._content = item;
				} else if (domClass.contains(item.domNode, "mblResponsiveOverlay")){
					this._overlay = item;
				}
			}, this);
			
			if(this.isOverlayVisible){
				this.showOverlay();
			} else {
				this.hideOverlay();
			}
		}
		
	});
});
