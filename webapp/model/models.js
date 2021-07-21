sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new sap.ui.model.json.JSONModel({
				isPhone: Device.system.phone,
				isTablet: Device.system.tablet,
				isDesktop: Device.system.desktop,
				isMobile: Device.system.phone || Device.system.tablet
			});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		}

	};
});