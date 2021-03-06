sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"koehler/T2000/model/models"
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("koehler.T2000.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.setFullscreen();
		},
		setFullscreen: function () {
			if ($(".sapMShell").length === 0) {
				setTimeout(this.setFullscreen.bind(this), 0);
				return;
			}
			var oShell = $(".sapMShell").control()[0];
			oShell.setAppWidthLimited(false);
		}
	});
});