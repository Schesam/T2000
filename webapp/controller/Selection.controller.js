sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("koehler.T2000.controller.Selection", {

		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("SelectionP").attachPatternMatched(this._onObjectMatched, this);
			oRouter.getRoute("Selection").attachPatternMatched(this._onObjectMatched, this);
		},
		_onObjectMatched: function (oEvent) {
			this._nParam = undefined;
			if (jQuery.sap.getUriParameters().get("num") !== null) {
				this._nParam = jQuery.sap.getUriParameters().get("num");
			}
		},
		onBacklogPress: function(oControlEvent) {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			if (this._Param) {
					oRouter.navTo("DetailP", {
					num: this._nParam
				}, true);
			} else {
				oRouter.navTo("Detail", null, true);
			}
		}
	});
});