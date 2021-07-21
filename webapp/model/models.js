sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new sap.ui.model.json.JSONModel({
				isPhone: sap.ui.Device.system.phone
			});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		}

	};
});