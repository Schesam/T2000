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
			this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			view.setModel(model);
			view.setBusyIndicatorDelay(0);

			this._areas = ["Abwesenheit", "Organisation", "Produkt", "Anforderung"];
			this._categories = ["I Timebox", "K Timebox", "Task"];
			this._tasks = ["Krankheit, Urlaub, Teilzeit", "Schulung, Ausbildung", "Team- und eigene Orga", "Incidents/Problems/Support",
				"PreZero", "VZ-Dispo 2020", "PreBull", "BBY", "S4HANA"
			];
			this._bcs = ["Silke Wünsch", "Amine Abida", "Emanuel", "Andreas", "Mike", "Sonstige", "Andreas"];
			this._status = ["Backlog", "Umsetzung", "Analyse", "Begleitung"];
			this._dialogs = {};

			this._fillData();
			this._fillTestData(50);
		},
		_updateRowCount: function () {
			var oTitle = this.byId("headerText");
			var oldText = oTitle.getText();
			if (oldText.includes("(")) {
				oldText = oldText.substring(0, oldText.lastIndexOf("("));
			}
			oTitle.setText(oldText + " (" + this.byId("valueTable").getBinding("items").getLength() + ")");
		},
		_createDialog: function (fragmentName) {
			var oDialog = this._dialogs[fragmentName];

			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(fragmentName, this);
				this._dialogs[fragmentName] = oDialog;
			}
			return oDialog;
		},
		onFilterButtonClick: function (oEvent) {
			this._createDialog("koehler.T2000.view.FilterDialog").open();
		},
		onFilterDialogConfirm: function (oEvent) {
			var oTable = this.byId("valueTable"),
				mParams = oEvent.getParameters(),
				aFilters = [];

			mParams.filterItems.forEach(function (oItem) {
				var aSplit = oItem.getKey().split("___"),
					sPath = aSplit[0],
					sVal = aSplit[1],
					oFilter = new Filter({
						path: sPath,
						test: function (oValue) {
							return oValue.toString().localeCompare(sVal, sap.ui.getCore().getConfiguration().getLanguage(), {
								sensitivity: "accent"
							}) === 0;
						}
					});
				aFilters.push(oFilter);
			});
			oTable.getBinding("items").filter(aFilters);

			this.byId("filterBar").setVisible(aFilters.length > 0);
			this.byId("filterLabel").setText(mParams.filterString);
			this._updateRowCount();
		},
		onSearch: function (oEvent) {
			var aFilter = [];

			var sQuery = this.byId("search").getValue();
			if (sQuery) {
				aFilter.push(new Filter({
					path: "",
					test: function (oValue) {
						var entries = Object.entries(oValue);
						for (var i = 0; i < entries.length; i++) {
							if (entries[i][1].toString().toLocaleLowerCase().includes(sQuery.toString().toLocaleLowerCase())) {
								return true;
							}
						}
						return false;
						// return this.byId("searchCheck").getSelected() ? result : !result;
					}
				}));
			}

			this.byId("valueTable").getBinding("items").filter(aFilter);
			this._updateRowCount();
		},
		_fillData: function () {
			this.byId("headerText").setText(this.byId("employeeSelect").getFirstItem().getText());
			this.byId("crStatusCombo").setModel(this._getModelForArray(this._status, ""));
			this.byId("crCategoryCombo").setModel(this._getModelForArray(this._categories, ""));
			this.byId("crAreaCombo").setModel(this._getModelForArray(this._areas, ""));
			this.byId("crTaskCombo").setModel(this._getModelForArray(this._tasks, ""));
			this.byId("crBCCombo").setModel(this._getModelForArray(this._bcs, ""));

			var oFilterDialog = this._createDialog("koehler.T2000.view.FilterDialog");
			oFilterDialog.setModel(this._getModelForArray(this._status, ""));
			oFilterDialog.setModel(this.getOwnerComponent().getModel("i18n"), "i18n");
		},
		_getModelForArray: function (arr, firstElementText) {
			var oJSONModel = new JSONModel();
			var oData = {};

			oData.row = new Array(arr.length + (firstElementText ? 1 : 0));
			if (firstElementText) {
				oData.row[0] = {};
				oData.row[0].Key = 0;
				oData.row[0].Value = firstElementText;
			}
			for (var i = 0; i < arr.length; i++) {
				var index = (i + (firstElementText ? 1 : 0));
				oData.row[index] = {};
				oData.row[index].Key = i + index;
				oData.row[index].Value = arr[i];
			}

			oJSONModel.setData({
				rows: oData.row
			});
			return oJSONModel;
		},
		onEmployeeSelect: function (oControlEvent) {
			this.byId("valueTable").setHeaderText(oControlEvent.getParameters().selectedItem.getText());
			this._updateRowCount();
		},
		onBacklogButtonClick: function (oEvent) {
			// this.byId("statusSelect").setSelectedItem("Backlog");
			this._onFilterStatus(1, "Backlog");
		},
		_fillTestData: function (num) {
			var oJSONModel = new JSONModel();
			var oData = {};
			oData.results = new Array(num);
			for (var i = 0; i < num; i++) {
				oData.results[i] = {};
				oData.results[i].Category = this._categories[this._categories.length * Math.random() | 0];
				oData.results[i].Area = this._areas[this._areas.length * Math.random() | 0];
				oData.results[i].Planned = i % 2 === 1;
				oData.results[i].CalendarWeek = "18";
				oData.results[i].Task = this._tasks[this._tasks.length * Math.random() | 0];
				oData.results[i].Project = "P0962";
				oData.results[i].Jira = "FXDFKA-1913";
				oData.results[i].Spec = "0098243";
				oData.results[i].BC = this._bcs[this._bcs.length * Math.random() | 0];
				oData.results[i].Status = this._status[this._status.length * Math.random() | 0];
				oData.results[i].Begin = "07.05.2021";
				oData.results[i].RealBegin = "07.05.2021";
				oData.results[i].End = "07.05.2021";
				oData.results[i].RealEnd = "08.05.2021";
				oData.results[i].Priority = i + 1;
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
			this._updateRowCount();
		},
		onSaveButtonClick: function (oEvent) {

		},
		onChangeTab: function (oEvent) {
			var b = oEvent.getParameters().selectedItem === this.byId("newEntryTab");
			this.byId("createButton").setVisible(b);
			this.byId("backlogButton").setVisible(!b);
		}
	});
});