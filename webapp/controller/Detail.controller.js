/* eslint-disable no-console */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter"
], function (Controller, JSONModel, Filter) {
	"use strict";

	return Controller.extend("koehler.T2000.controller.Detail", {
		onInit: function () {
			if (Controller.prototype.onInit) {
				Controller.prototype.onInit.apply(this, arguments);
			}
			var view = this.getView();
			// this.getOwnerComponent().addView(view);
			var model = new JSONModel({});
			model.setSizeLimit(999999999);
			view.setModel(model);
			view.setBusyIndicatorDelay(0);
			this._onFillTestData();
		},
		_onEmployeeSelect: function (oControlEvent) {
			this.byId("valueTable").setHeaderText(oControlEvent.getParameters().getSelectedItem().getText());
		},
		_onStatusSelect: function (oControlEvent) {
			var item = oControlEvent.getParameters().selectedItem;
			this._onFilterContent(item.getKey(), item.getText());
		},
		_onBacklogButton: function (oEvent) {
			// this.byId("statusSelect").setSelectedItem("Backlog");
			this._onFilterContent(1, "Backlog");
		},
		_onFilterContent: function (key, text) {
			var aFilter = [];
			if (parseInt(key, 10) > 0) {
				aFilter.push(new Filter({
					path: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("colStatus"),
					test: function (oValue) {
						return oValue.localeCompare(text, sap.ui.getCore().getConfiguration().getLanguage(), {
							sensitivity: 'accent'
						}) === 0;
					}.bind(this)
				}));
			} else {
				aFilter.push(new Filter({
					path: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("colStatus"),
					test: function (oValue) {
						return true;
					}.bind(this)
				}));
			}
			this.byId("valueTable").getBinding("items").filter(aFilter);
		},
		_onFillTestData: function () {
			var oJSONModel = new JSONModel();
			var oData = new Object();
			oData.results = new Array(new Object(), new Object());
			for (var i = 0; i < 2; i++) {
				oData.results[i].Category = "Task";
				oData.results[i].Area = "Anforderung";
				oData.results[i].Planned = i % 2 === 1;
				oData.results[i].CalendarWeek = "18";
				oData.results[i].Task = "VZ-Dispo 2020";
				oData.results[i].Project = "P0962";
				oData.results[i].Jira = "FXDFKA-1913";
				oData.results[i].Spec = "0098243";
				oData.results[i].BC = "Silke Wünsch";
				oData.results[i].Status = "Backlog";
				oData.results[i].Begin = "07.05.2021";
				oData.results[i].RealBegin = "07.05.2021";
				oData.results[i].End = "07.05.2021";
				oData.results[i].RealEnd = "08.05.2021";
				oData.results[i].Priority = "1";
				oData.results[i].System = [{
					name: "E00"
				}, {
					name: "ET1"
				}];
				oData.results[i].Transport = [{
					name: "123456789"
				}, {
					name: "987654321"
				}];
				oData.results[i].Comment = "Mehrzeiliges Kommentarfeld";
			}
			oJSONModel.setData({
				rows: oData.results
			});
			this.byId("valueTable").setModel(oJSONModel);
		},
		_onSaveButtonClick: function (oEvent) {

		},
		_onChangeTab: function (oEvent) {
			var b = oEvent.getParameters().selectedItem === this.byId("newEntryTab");
			this.byId("createButton").setVisible(b);
			this.byId("backlogButton").setVisible(!b);
		}
	});
});