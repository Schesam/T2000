/* eslint-disable no-console, complexity*/
/* global koehler:true */
(function () {
	jQuery.sap.declare("koehler.T2000.Formatter");
	jQuery.sap.require("sap.ui.base.Object");

	sap.ui.base.Object.extend("koehler.T2000.Formatter", {});

	koehler.T2000.Formatter._formatDate = function (oDate) {
		this._formatDate(oDate, false);
	};

	koehler.T2000.Formatter._formatDate = function (oDate, withWeekDay) {
		var options = {
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		};
		if (withWeekDay) {
			options.weekday = "long";
		}
		if (oDate) {
			if (!(oDate instanceof Date)) {
				oDate = new Date(oDate);
			}
			return oDate.toLocaleDateString("de-de", options);
		}
		return "";
	};
})();
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"koehler/T2000/Formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/Token"
], function (Controller, JSONModel, Filter, Sorter, Formatter, MessageBox, MessageToast, Token) {
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

			this._addValidator(this.byId("crSystemMulti"));
			this._addValidator(this.byId("crTransportMulti"));

			this._registerGlobals();
			this._fillData();
			this._fillTestData(5);
		},
		_addValidator: function (multiInput) {
			multiInput.addValidator(function (args) {
				var text = args.text;
				return new Token({
					key: text,
					text: text
				});
			});
		},
		_registerGlobals: function () {
			this._columNames = [];
			var columns = this.byId("valueTable").getColumns();
			for (var i = 0; i < columns.length; i++) {
				this._columNames.push(columns[i].getHeader().getText());
			}
			this._areas = ["Abwesenheit", "Organisation", "Produkt", "Anforderung"];
			this._categories = ["I Timebox", "K Timebox", "Task"];
			this._tasks = ["Krankheit, Urlaub, Teilzeit", "Schulung, Ausbildung", "Team- und eigene Orga", "Incidents/Problems/Support",
				"PreZero", "VZ-Dispo 2020", "PreBull", "BBY", "S4HANA"
			];
			this._bcs = ["Silke Wünsch", "Amine Abida", "Emanuel", "Andreas", "Mike", "Sonstige", "Andreas"];
			this._status = ["Backlog", "Umsetzung", "Analyse", "Begleitung"];
			this._dialogs = {};
			this._groupFunctions = {
				Category: function (oContext) {
					var cat = oContext.getProperty("Category");
					return {
						key: cat,
						text: cat
					};
				},
				Area: function (oContext) {
					var area = oContext.getProperty("Area");
					return {
						key: area,
						text: area
					};
				},
				Planned: function (oContext) {
					var planned = oContext.getProperty("Planned");
					return {
						key: planned,
						text: planned
					};
				},
				CalendarWeek: function (oContext) {
					var week = oContext.getProperty("CalendarWeek");
					return {
						key: week,
						text: week
					};
				},
				Task: function (oContext) {
					var task = oContext.getProperty("Task");
					return {
						key: task,
						text: task
					};
				},
				Project: function (oContext) {
					var project = oContext.getProperty("Project");
					return {
						key: project,
						text: project
					};
				},
				Jira: function (oContext) {
					var jira = oContext.getProperty("Jira");
					return {
						key: jira,
						text: jira
					};
				},
				Spec: function (oContext) {
					var spec = oContext.getProperty("Spec");
					return {
						key: spec,
						text: spec
					};
				},
				BC: function (oContext) {
					var bc = oContext.getProperty("BC");
					return {
						key: bc,
						text: bc
					};
				},
				Status: function (oContext) {
					var status = oContext.getProperty("Status");
					return {
						key: status,
						text: status
					};
				},
				Begin: function (oContext) {
					var begin = oContext.getProperty("Begin");
					return {
						key: begin,
						text: begin
					};
				},
				RealBegin: function (oContext) {
					var realB = oContext.getProperty("RealBegin");
					return {
						key: realB,
						text: realB
					};
				},
				End: function (oContext) {
					var end = oContext.getProperty("End");
					return {
						key: end,
						text: end
					};
				},
				RealEnd: function (oContext) {
					var realE = oContext.getProperty("RealEnd");
					return {
						key: realE,
						text: realE
					};
				},
				Priority: function (oContext) {
					var prio = oContext.getProperty("Priority");
					return {
						key: prio,
						text: prio
					};
				},
				System: function (oContext) {
					var sys = oContext.getProperty("System");
					return {
						key: sys[0].name,
						text: sys[0].name
					};
				},
				Transport: function (oContext) {
					var trans = oContext.getProperty("Transport");
					return {
						key: trans[0].name,
						text: trans[0].name
					};
				},
				Comment: function (oContext) {
					var comment = oContext.getProperty("Comment");
					return {
						key: comment,
						text: comment
					};
				}
			};
		},
		_updateRowCount: function () {
			var oTitle = this.byId("headerText"),
				oldText = oTitle.getText();
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
			this._createDialog("koehler.T2000.fragment.FilterDialog").open();
		},
		onGroupButtonClick: function (oEvent) {
			this._createDialog("koehler.T2000.fragment.GroupDialog").open();
		},
		onSortButtonClick: function (oEvent) {
			this._createDialog("koehler.T2000.fragment.SortDialog").open();
		},
		onGroupDialogConfirm: function (oEvent) {
			var oTable = this.byId("valueTable"),
				mParams = oEvent.getParameters(),
				sPath,
				aSorters = [],
				aGroups = [];

			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				aSorters.push(new Sorter(this._getColIdForIndex(sPath), mParams.groupDescending));
				oTable.getBinding("items").sort(aSorters);
				aGroups.push(new Sorter(sPath, mParams.groupDescending, this._groupFunctions[this._getColIdForIndex(sPath)]));
				oTable.getBinding("items").sort(aGroups);
			} else {
				oTable.getBinding("items").sort();
			}
		},
		onSortDialogConfirm: function (oEvent) {
			var mParams = oEvent.getParameters(),
				aSorters = [];
			aSorters.push(new Sorter(this._getColIdForIndex(mParams.sortItem.getKey()), mParams.sortDescending));
			this.byId("valueTable").getBinding("items").sort(aSorters);
		},
		_getColIdForIndex: function (index) {
			var sKey;
			switch (this._columNames[index]) {
			case this._i18n.getText("colCategory"):
				sKey = "Category";
				break;
			case this._i18n.getText("colArea"):
				sKey = "Area";
				break;
			case this._i18n.getText("colPlanned"):
				sKey = "Planned";
				break;
			case this._i18n.getText("colCalendarWeek"):
				sKey = "CalendarWeek";
				break;
			case this._i18n.getText("colTask"):
				sKey = "Task";
				break;
			case this._i18n.getText("colProject"):
				sKey = "Project";
				break;
			case this._i18n.getText("colJira"):
				sKey = "Jira";
				break;
			case this._i18n.getText("colSpec"):
				sKey = "Spec";
				break;
			case this._i18n.getText("colBC"):
				sKey = "BC";
				break;
			case this._i18n.getText("colStatus"):
				sKey = "Status";
				break;
			case this._i18n.getText("colBegin"):
				sKey = "Begin";
				break;
			case this._i18n.getText("colRealBegin"):
				sKey = "RealBegin";
				break;
			case this._i18n.getText("colEnd"):
				sKey = "End";
				break;
			case this._i18n.getText("colRealEnd"):
				sKey = "RealEnd";
				break;
			case this._i18n.getText("colPriority"):
				sKey = "Priority";
				break;
			case this._i18n.getText("colSystem"):
				sKey = "System";
				break;
			case this._i18n.getText("colTransport"):
				sKey = "Transport";
				break;
			case this._i18n.getText("colComment"):
				sKey = "Comment";
				break;
			default:
				sKey = "Category";
			}
			return sKey;
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
			var aFilter = [],
				sQuery = this.byId("search").getValue();

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

			var oFilterDialog = this._createDialog("koehler.T2000.fragment.FilterDialog");
			oFilterDialog.setModel(this._getModelForArray(this._status, ""));
			oFilterDialog.setModel(this.getOwnerComponent().getModel("i18n"), "i18n");
			// oFilterDialog.setModel(this._getModelForArray(this._columNames, ""));

			var oSortDialog = this._createDialog("koehler.T2000.fragment.SortDialog");
			oSortDialog.setModel(this._getModelForArray(this._columNames, ""));

			var oGroupDialog = this._createDialog("koehler.T2000.fragment.GroupDialog");
			oGroupDialog.setModel(this._getModelForArray(this._columNames, ""));
		},
		_getModelForArray: function (arr, firstElementText) {
			var oJSONModel = new JSONModel(),
				oData = {};

			oData.row = new Array(arr.length + (firstElementText ? 1 : 0));
			if (firstElementText) {
				oData.row[0] = {};
				oData.row[0].Key = 0;
				oData.row[0].Value = firstElementText;
			}
			for (var i = 0; i < arr.length; i++) {
				var index = (i + (firstElementText ? 1 : 0));
				oData.row[index] = {};
				oData.row[index].Key = index;
				oData.row[index].Value = arr[i];
			}

			oJSONModel.setData({
				rows: oData.row
			});
			return oJSONModel;
		},
		onEmployeeSelect: function (oControlEvent) {
			this.byId("headerText").setText(oControlEvent.getParameters().selectedItem.getText());
			this._updateRowCount();
		},
		onBacklogButtonClick: function (oEvent) {
			var oTable = this.byId("valueTable"),
				aFilters = [],
				oFilter = new Filter({
					path: "Status",
					test: function (oValue) {
						return oValue.toString().localeCompare("Backlog", sap.ui.getCore().getConfiguration().getLanguage(), {
							sensitivity: "accent"
						}) === 0;
					}
				});
			aFilters.push(oFilter);
			oTable.getBinding("items").filter(aFilters);
			this._updateRowCount();
		},
		_fillTestData: function (num) {
			var oJSONModel = new JSONModel(),
				oData = {};
			oData.results = new Array(num);
			for (var i = 0; i < num; i++) {
				oData.results[i] = {};
				oData.results[i].Category = this._categories[this._categories.length * Math.random() | 0];
				oData.results[i].Area = this._areas[this._areas.length * Math.random() | 0];
				oData.results[i].Planned = i % 2 === 1;
				oData.results[i].CalendarWeek = i + 1;
				oData.results[i].Task = this._tasks[this._tasks.length * Math.random() | 0];
				oData.results[i].Project = "P0962" + i;
				oData.results[i].Jira = "FXDFKA-191" + i;
				oData.results[i].Spec = "009824" + i;
				oData.results[i].BC = this._bcs[this._bcs.length * Math.random() | 0];
				oData.results[i].Status = this._status[this._status.length * Math.random() | 0];
				oData.results[i].Begin = "07.05.2021";
				oData.results[i].RealBegin = "07.05.2021";
				oData.results[i].End = "07.05.2021";
				oData.results[i].RealEnd = "08.05.2021";
				oData.results[i].Priority = i + 1;
				oData.results[i].System = [{
					name: "E" + i
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
			if (this._checkIfFormFilled()) {
				var rowData = this.byId("valueTable").getModel().getData();
				var obj = {};
				obj.Category = this.byId("crCategoryCombo").getValue();
				obj.Area = this.byId("crAreaCombo").getValue();
				obj.Planned = this.byId("crPlanned").getState();
				obj.CalendarWeek = this.byId("crCalendarWeek").getValue();
				obj.Task = this.byId("crTaskCombo").getValue();
				obj.Project = this.byId("crProject").getValue();
				obj.Jira = this.byId("crJira").getValue();
				obj.Spec = this.byId("crSpec").getValue();
				obj.BC = this.byId("crBCCombo").getValue();
				obj.Status = this.byId("crStatusCombo").getValue();
				obj.Begin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				obj.RealBegin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				obj.End = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());
				obj.RealEnd = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());
				obj.Priority = this.byId("crPriority").getValue();

				obj.System = [];
				this.byId("crSystemMulti").getTokens().forEach(token => obj.System.push({
					name: token.getText().toUpperCase()
				}));
				obj.Transport = [];
				this.byId("crTransportMulti").getTokens().forEach(token => obj.Transport.push({
					name: token.getText()
				}));

				obj.Comment = this.byId("crComment").getValue();
				rowData.rows.push(obj);

				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: rowData.rows
				});
				this.byId("valueTable").setModel(oJSONModel);
				this._updateRowCount();
				this.byId("tabs").setSelectedKey(0);
				this.byId("createButton").setVisible(false);
				this.byId("backlogButton").setVisible(true);
				MessageToast.show(this._i18n.getText("messageSuccessfullCreated"));
			}
		},
		_checkIfFormFilled: function () {
			if (!this.byId("crCategoryCombo").getValue() ||
				!this.byId("crAreaCombo").getValue() ||
				!this.byId("crCalendarWeek").getValue() ||
				!this.byId("crTaskCombo").getValue() ||
				!this.byId("crProject").getValue() ||
				!this.byId("crJira").getValue() ||
				!this.byId("crSpec").getValue() ||
				!this.byId("crBCCombo").getValue() ||
				!this.byId("crStatusCombo").getValue() ||
				!this.byId("crPriority").getValue() ||
				this.byId("crSystemMulti").getTokens().length <= 0 ||
				this.byId("crTransportMulti").getTokens().length <= 0 ||
				!this.byId("crComment").getValue()) {
				MessageBox.error(this._i18n.getText("messageEmptyFields"), {
					title: this._i18n.getText("error")
				});
				return false;
			}
			if (!this._isNumeric(this.byId("crCalendarWeek").getValue()) ||
				parseInt(this.byId("crCalendarWeek").getValue(), 10) < 1 ||
				!this.byId("crTimerange").getDateValue() ||
				!this.byId("crTimerange").getSecondDateValue() ||
				parseInt(this.byId("crCalendarWeek").getValue(), 10) > 52) {
				MessageBox.error(this._i18n.getText("messageWrongDates"), {
					title: this._i18n.getText("error")
				});
				return false;
			}
			return true;
		},
		_isNumeric: function (str) {
			if (typeof str !== "string" && typeof str !== "number") {
				return false;
			}
			return !isNaN(str) && !isNaN(parseFloat(str));
		},
		onChangeTab: function (oEvent) {
			var b = oEvent.getParameters().selectedItem === this.byId("newEntryTab");
			this.byId("createButton").setVisible(b);
			this.byId("backlogButton").setVisible(!b);
		}
	});
});