define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojo/dom-class"
], function(declare, arrayUtil, _Contained, _Container, _WidgetBase, domClass){

	// module:
	//		my/ResponsiveContent

	return declare([_WidgetBase, _Container, _Contained], {
		
		minimize: function(region){
			domClass.add(this.domNode, "mblResponsiveContentOverlayed_"+region);
		},
		
		maximize: function(region){
			domClass.remove(this.domNode, "mblResponsiveContentOverlayed_"+region);
		},
		
		
		postCreate: function(){
			this.inherited(arguments);
			
			domClass.add(this.domNode,"mblResponsiveContent");
		}
	});
});