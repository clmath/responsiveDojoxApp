define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/window",
		"dojo/query", "dojo/dom-geometry", "dojo/dom-attr", "dojo/dom-style", "dijit/registry",
		"dojox/app/controllers/LayoutBase", "dojox/app/utils/layout", "dojox/app/utils/constraints"],
function(declare, lang, array, win, query, domGeom, domAttr, domStyle, registry, LayoutBase, layout, constraints){
	// module:
	//		firstApp/controllers/CustomLayout
	// summary:
	//		Bind "initLayout" and "layoutView" events on dojox/app application instance.

	return declare(LayoutBase, {

		constructor: function(app, events){
			// summary:
			//		bind "initLayout" and "layoutView" events on application instance.
			//
			// app:
			//		dojox/app application instance.
			// events:
			//		{event : handler}
		},

		initLayout: function(event){
			// summary:
			//		Response to dojox/app "initLayout" event.
			//
			// example:
			//		Use dojo/on.emit to trigger "initLayout" event, and this function will respond to the event. For example:
			//		|	on.emit(this.app.evented, "initLayout", view);
			//
			// event: Object
			// 		{"view": view, "callback": function(){}};
			this.app.log("in app/controllers/Layout.initLayout event=",event);
			this.app.log("in app/controllers/Layout.initLayout event.view.parent.name=[",event.view.parent.name,"]");

			event.view.parent.domNode.appendChild(event.view.domNode);

			domAttr.set(event.view.domNode, "data-app-constraint", event.view.constraint);

			this.inherited(arguments);
		},

		_doResize: function(view){
			// summary:
			//		resize view.
			//
			// view: Object
			//		view instance needs to do layout.
			var node = view.domNode;
			if(!node){
				this.app.log("Warning - View has not been loaded, in LayoutBase _doResize view.domNode is not set for view.id="+view.id+" view=",view);
				return;
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.
			var mb = {};
			if( !("h" in mb) || !("w" in mb) ){
				mb = lang.mixin(domGeom.getMarginBox(node), mb);	// just use dojo/_base/html.marginBox() to fill in missing values
			}

			// Compute and save the size of my border box and content box
			// (w/out calling dojo/_base/html.contentBox() since that may fail if size was recently set)
			if(view !== this.app){
				var cs = domStyle.getComputedStyle(node);
				var me = domGeom.getMarginExtents(node, cs);
				var be = domGeom.getBorderExtents(node, cs);
				var bb = (view._borderBox = {
					w: mb.w - (me.w + be.w),
					h: mb.h - (me.h + be.h)
				});
				var pe = domGeom.getPadExtents(node, cs);
				view._contentBox = {
					l: domStyle.toPixelValue(node, cs.paddingLeft),
					t: domStyle.toPixelValue(node, cs.paddingTop),
					w: bb.w - pe.w,
					h: bb.h - pe.h
				};
			}else{
				// if we are layouting the top level app the above code does not work when hiding address bar
				// so let's use similar code to dojo mobile.
				view._contentBox = {
					l: 0,
					t: 0,
					h: win.global.innerHeight || win.doc.documentElement.clientHeight,
					w: win.global.innerWidth || win.doc.documentElement.clientWidth
				};
			}

			this.inherited(arguments);
		}

		/*layoutView: function(event){
			// summary:
			//		Response to dojox/app "layoutView" event.
			//
			// example:
			//		Use dojo/on.emit to trigger "layoutView" event, and this function will response the event. For example:
			//		|	on.emit(this.app.evented, "layoutView", view);
			//
			// event: Object
			// |		{"parent":parent, "view":view, "removeView": boolean}
			if(event.view){
				this.inherited(arguments);
				// do selected view layout
				// call _doResize for parent and view here, doResize will no longer call it for all children.
				this._doResize(event.parent || this.app);
				this._doResize(event.view);
			}
		},*/

		
	});
});
