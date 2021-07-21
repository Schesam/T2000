sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("koehler.T2000.controller.App", {
		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			if (jQuery.sap.getUriParameters().get("num") !== null) {
				oRouter.navTo("DetailP", {
					num: jQuery.sap.getUriParameters().get("num")
				}, true);
			} else {
				oRouter.navTo("Detail", null, true);
				// oRouter.navTo("DetailP", {
				// 	num: 10
				// }, true);
			}
		}
	});

});