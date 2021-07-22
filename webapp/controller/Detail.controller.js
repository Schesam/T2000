/* eslint-disable no-console, max-params, sap-timeout-usage, sap-no-hardcoded-url*/
/* eslint complexity: [error, 25] */
/* global moment:true */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"koehler/T2000/Formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/Token",
	"sap/ui/model/odata/v2/ODataModel",
	"koehler/T2000/moment-with-locales"
], function (Controller, JSONModel, Filter, Sorter, Formatter, MessageBox, MessageToast, Token, ODataModel, Moment) {
	"use strict";

	return Controller.extend("koehler.T2000.controller.Detail", {
		onInit: function () {
			if (Controller.prototype.onInit) {
				Controller.prototype.onInit.apply(this, arguments);
			}
			this._appController = sap.ui.controller("koehler.T2000.controller.App");
			this._oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this.getView().setBusyIndicatorDelay(0);

			this._addValidator(this.byId("systemMulti"));
			this._addValidator(this.byId("transportMulti"));

			// this._readCurrentUser(this._oDataModel);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("DetailP").attachPatternMatched(this._onObjectMatched, this);
			oRouter.getRoute("Detail").attachPatternMatched(this._loadNoParam, this);
			this.byId("headerBar").setWidth($(window).width() + "px");
			this.byId("filterBar").setWidth($(window).width() + "px");
		},
		onAfterRendering: function () {
			this._registerGlobals();
		},
		onNavBack: function (oEvent) {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			if (jQuery.sap.getUriParameters().get("num") !== null) {
				oRouter.navTo("SelectionP", {
					num: jQuery.sap.getUriParameters().get("num")
				}, true);
			} else {
				oRouter.navTo("Selection", null, true);
			}
		},
		_loadNoParam: function (oEvent) {
			this._load(500);
		},
		_onObjectMatched: function (oEvent) {
			var args = oEvent.getParameter("arguments");
			var num = args.num;
			this._load(num);
		},
		_load: async function (num) {
			console.log("Loading");
			const result = await this._loader(num);
			console.log(result);
		},
		_loader: function (num) {
			var that = this;
			var oView = this.getView();
			oView.setBusy(true);
			return new Promise(function (resolved, rejected) {
				setTimeout(function () {
					that._fillData();
					that._fillTestData(num);
					that._updateFilterModel();
					oView.setBusy(false);
					resolved("Done");
				}, 2000);
			});
		},
		_addValidator: function (multiInput) {
			multiInput.addValidator(function (args) {
				var sText = args.text;
				return new Token({
					key: sText,
					text: sText
				});
			});
		},
		_registerGlobals: function () {
			// this._webUrl = "https://schwarzit.sharepoint.com/";
			// this._apiUrl = "https://schwarzit.sharepoint.com/_api";
			// this._oDataModel = new ODataModel(this._apiUrl + "/", {
			// 	json: true,
			// 	useBatch: false,
			// 	headers: {
			// 		"Cache-Control": "max-age=0",
			// 		"X-CSRF-Token": "Fetch",
			// 		"X-RequestDigest": $("#_REQUESTDIGEST").val()
			// 	}
			// });
			this._columnNames = [];
			var that = this;
			var dev = sap.ui.Device.system;
			if (dev.tablet || dev.phone) {
				this.byId("valueTable").attachBrowserEvent("tap", function (oEvent) {
					try {
						that._extractRowIndex(sap.ui.getCore().byId($("#" + oEvent.target.id).parent()[0].id).getBindingContextPath());
					} catch (e) {
						console.log("Probably pressed on Cell, not Row");
						console.error(e);
					}
				});
			} else {
				this.byId("valueTable").attachBrowserEvent("dblclick", function (oEvent) {
					try {
						that._extractRowIndex(sap.ui.getCore().byId($("#" + oEvent.toElement.id).parent()[0].id).getBindingContextPath());
					} catch (e) {
						console.log("Probably pressed on Cell, not Row");
						console.error(e);
					}
				});
			}
			sap.ui.Device.resize.attachHandler(function (oEvent) {
				that.byId("headerBar").setWidth($(window).width() + "px");
				that.byId("filterBar").setWidth($(window).width() + "px");
			});
			this.byId("valueTable").getColumns().forEach(column => {
				this._columnNames.push(column.getHeader().getText());
			});
			this._columnIds = ["Category", "Area", "Planned", "CalendarWeek", "Task", "Project", "Jira", "Spec", "BC", "Status", "Begin",
				"RealBegin", "End", "RealEnd", "Estimation", "Priority", "System", "Transport", "Comment", "Creator", "CreationDate", "Changer",
				"ChangingDate"
			];
			this._dateColumns = ["Begin", "RealBegin", "End", "RealEnd", "CreationDate", "ChangingDate"];
			this._hiddenColumns = [];
			var columns = this.byId("valueTable").getColumns();
			for (var i = 0; i < columns.length; i++) {
				if (!columns[i].getVisible()) {
					this._hiddenColumns.push(this._columnIds[i]);
				}
			}
			this._areas = ["Abwesenheit", "Organisation", "Produkt", "Anforderung"];
			this._categories = ["I Timebox", "K Timebox", "Task"];
			this._tasks = ["Krankheit, Urlaub, Teilzeit", "Schulung, Ausbildung", "Team- und eigene Orga", "Incidents/Problems/Support",
				"PreZero", "VZ-Dispo 2020", "PreBull", "BBY", "S4HANA"
			];
			this._bcs = ["Silke Wünsch", "Amine Abida", "Emanuel", "Andreas", "Mike", "Sonstige", "Andreas"];
			this._status = ["Backlog", "Umsetzung", "Analyse", "Begleitung"];
			this._dialogs = {};
			this._groupFunctions = {};
			this._columnIds.forEach(id => {
				this._groupFunctions[id] = function (oContext) {
					var sName = oContext.getProperty(id);
					return {
						key: sName,
						text: sName
					};
				};
			});
		},
		_updateRowCount: function () {
			var oTitle = this.byId("headerText"),
				oldText = oTitle.getText();
			if (oldText.includes("(")) {
				oldText = oldText.substring(0, oldText.lastIndexOf("("));
			}
			oTitle.setText(oldText + " (" + this._getRowCount() + ")");
			// this._updateFilterModel();
		},
		_getRowCount: function () {
			return this.byId("valueTable").getBinding("items").getLength();
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
			var oFilterDialog = this._createDialog("koehler.T2000.fragment.FilterDialog");
			oFilterDialog.setModel(this._filterModel);
			oFilterDialog.open();
		},
		_updateFilterModel: function () {
			var oJSONModel = new JSONModel(),
				aRows = this.byId("valueTable").getBinding("items").getModel().getData().rows,
				aArr = new Array(aRows.length);
			aRows.forEach(row =>
				Object.entries(row).forEach(prop => {
					aArr[prop[0]] = [];
				})
			);
			aArr.Names = {};
			for (var i = 0; i < this._columnIds.length; i++) {
				aArr.Names[this._columnIds[i]] = {
					Key: this._columnIds[i],
					Value: this._columnNames[i],
					Items: []
				};
			}
			aRows.forEach(row => {
				var aEntries = Object.entries(row);
				for (var j = 0; j < aEntries.length; j++) {
					if (!Array.isArray(aEntries[j][1])) {
						aArr.Names[this._columnIds[j]].Items.push({
							Key: this._columnIds[j],
							Name: aEntries[j][1]
						});
					} else {
						for (var k = 0; k < aEntries[j][1].length; k++) {
							aArr.Names[this._columnIds[j]].Items.push({
								Key: this._columnIds[j],
								Name: aEntries[j][1][k].Name
							});
						}
					}
				}
			});
			for (i = 0; i < Object.entries(aArr.Names).length; i++) {
				aArr.Names[this._columnIds[i]].Items = this._appController.uniqBy(aArr.Names[this._columnIds[i]].Items, JSON.stringify);
			}
			for (i = 0; i < this._dateColumns.length; i++) {
				aArr.Names[this._dateColumns[i]].Items = [{
					Key: this._dateColumns[i] + "___7___days",
					Name: this._oI18n.getText("lastWeek")
				}, {
					Key: this._dateColumns[i] + "___1___months",
					Name: this._oI18n.getText("lastMonth")
				}, {
					Key: this._dateColumns[i] + "___3___months",
					Name: this._oI18n.getText("lastThreeMonths")
				}, {
					Key: this._dateColumns[i] + "___6___months",
					Name: this._oI18n.getText("lastSixMonths")
				}, {
					Key: this._dateColumns[i] + "___1___years",
					Name: this._oI18n.getText("lastYear")
				}];
			}
			oJSONModel.setData({
				rows: aArr
			});
			this._filterModel = oJSONModel;
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
			return this._columnIds[index];
		},
		onFilterDialogConfirm: function (oEvent) {
			var oTable = this.byId("valueTable"),
				mParams = oEvent.getParameters(),
				aFilters = [],
				that = this;

			mParams.filterItems.forEach(function (oItem) {
				var aSplit = oItem.getKey().split("___"),
					sPath = aSplit[1],
					sVal = aSplit[0],
					oFilter = new Filter({
						path: sPath,
						test: function (oValue) {
							if (!Array.isArray(oValue)) {
								if (that._dateColumns.includes(sPath)) {
									return moment(oValue, "DD.MM.yyyy").isBetween(moment().subtract(aSplit[2], aSplit[3]), moment(), aSplit[3], true);
								} else {
									return oValue.toString().localeCompare(sVal, sap.ui.getCore().getConfiguration().getLanguage(), {
										sensitivity: "accent"
									}) === 0;
								}
							} else {
								for (var i = 0; i < oValue.length; i++) {
									if (oValue[i].Name.toString().localeCompare(sVal, sap.ui.getCore().getConfiguration().getLanguage(), {
											sensitivity: "accent"
										}) === 0) {
										return true;
									}
								}
								return false;
							}
						}
					});
				aFilters.push(oFilter);
			});
			oTable.getBinding("items").filter(aFilters);

			this.byId("filterBar").setVisible(aFilters.length > 0);
			this.byId("filterLabel").setText(mParams.filterString);
			this._updateRowCount();
		},
		onLiveSearch: function (oEvent) {
			if (this._getRowCount() <= 8000) {
				this.onSearch(oEvent);
			}
		},
		onSearch: async function (oEvent) {
			console.log("Searching...");
			await this._doSearch();
			console.log("Done");
		},
		_doSearch: function () {
			var that = this;
			return new Promise(function (resolved, rejected) {
				setTimeout(function () {
					var aFilter = [],
						sQuery = that.byId("search").getValue();

					that.byId("valueTable").setBusy(true);
					if (sQuery) {
						aFilter.push(new Filter({
							path: "",
							test: function (oValue) {
								var entries = Object.entries(oValue);
								for (var i = 0; i < entries.length; i++) {
									if (!that._hiddenColumns.includes(entries[i][0])) {
										if (!Array.isArray(entries[i][1])) {
											if (entries[i][1].toString().toLocaleLowerCase().includes(sQuery.toString().toLocaleLowerCase())) {
												return true;
											}
										} else {
											for (var j = 0; j < entries[i][1].length; j++) {
												if (entries[i][1][j].Name.toString().toLocaleLowerCase().includes(sQuery.toString().toLocaleLowerCase())) {
													return true;
												}
											}
										}
									}
								}
								return false;
							}
						}));
					}

					that.byId("valueTable").getBinding("items").filter(aFilter);
					that._updateRowCount();
					that.byId("valueTable").setBusy(false);
				}, 10);
			});
		},
		_fillData: function () {
			this.byId("headerText").setText(this.byId("employeeSelect").getFirstItem().getText());
			this.byId("crStatusCombo").setModel(this._appController.getModelForArray(this._status, ""));
			this.byId("crCategoryCombo").setModel(this._appController.getModelForArray(this._categories, ""));
			this.byId("crAreaCombo").setModel(this._appController.getModelForArray(this._areas, ""));
			this.byId("crTaskCombo").setModel(this._appController.getModelForArray(this._tasks, ""));
			this.byId("crBCCombo").setModel(this._appController.getModelForArray(this._bcs, ""));

			var oFilterDialog = this._createDialog("koehler.T2000.fragment.FilterDialog");
			oFilterDialog.setModel(this.getOwnerComponent().getModel("i18n"), "i18n");

			var oSortDialog = this._createDialog("koehler.T2000.fragment.SortDialog");
			oSortDialog.setModel(this._appController.getModelForArray(this._columnNames, ""));

			var oGroupDialog = this._createDialog("koehler.T2000.fragment.GroupDialog");
			oGroupDialog.setModel(this._appController.getModelForArray(this._columnNames, ""));
		},
		onEmployeeSelect: function (oControlEvent) {
			this.byId("headerText").setText(oControlEvent.getParameters().selectedItem.getText());
			this.byId("filterBar").setVisible(false);
			this._updateData(oControlEvent.getParameters().selectedItem);
		},
		onBacklogButtonClick: function (oEvent) {
			var oEventOwn = {},
				oI18n = this._oI18n;
			oEventOwn.getParameters = function () {
				var params = {};
				params.filterItems = [{
					getKey: function () {
						return oI18n.getText("backlog") + "___Status";
					}
				}];
				params.filterString = oI18n.getText("filteredBy") + ": Status (" + oI18n.getText("backlog") + ")";
				return params;
			};
			this.onFilterDialogConfirm(oEventOwn);
		},
		_getTestData: function (num, employee) {
			var oData = {};
			oData = new Array(num);
			for (var i = 0; i < num; i++) {
				oData[i] = {};
				oData[i].Category = this._categories[this._categories.length * Math.random() | 0];
				oData[i].Area = this._areas[this._areas.length * Math.random() | 0];
				oData[i].Planned = i % 2 === 1;
				oData[i].CalendarWeek = i + 1;
				oData[i].Task = this._tasks[this._tasks.length * Math.random() | 0];
				oData[i].Project = "P0962" + i;
				oData[i].Jira = "FXDFKA-191" + i;
				oData[i].Spec = "009824" + i;
				oData[i].BC = this._bcs[this._bcs.length * Math.random() | 0];
				oData[i].Status = this._status[this._status.length * Math.random() | 0];
				oData[i].Begin = moment().subtract(i + 4, "days").format("DD.MM.YYYY");
				oData[i].RealBegin = moment().subtract(i + 4, "days").format("DD.MM.YYYY");
				oData[i].Estimation = 4 * 8;
				oData[i].End = moment().subtract(i, "days").format("DD.MM.YYYY");
				oData[i].RealEnd = moment().subtract(i, "days").format("DD.MM.YYYY");
				oData[i].Priority = i + 1;
				oData[i].System = [{
					Name: "E" + i
				}, {
					Name: "ET1"
				}];
				oData[i].Transport = [{
					Name: "123456789"
				}, {
					Name: "987654321"
				}];
				oData[i].Comment = [{
					Name: "Mehrzeiliges KommentarfeldMehrzeiliges KommentarfeldMehrzeiliges KommentarfeldMehrzeiliges KommentarfeldMehrzeiliges KommentarfeldMehrzeiliges Kommentarfeld"
				}];
				oData[i].Creator = employee;
				oData[i].CreationDate = moment().format("DD.MM.YYYY HH:mm:ss");
				oData[i].Changer = employee;
				oData[i].ChangingDate = moment().format("DD.MM.YYYY HH:mm:ss");
			}
			return oData;
		},
		_fillTestData: function (num) {
			var that = this;
			this._dataModels = {};
			this.byId("employeeSelect").getItems().forEach(item => {
				this._dataModels[item.getKey()] = {
					employee: item.getText(),
					results: that._getTestData(num, item.getText())
				};
			});
			this._updateData(this.byId("employeeSelect").getFirstItem());
		},
		_updateData: function (item) {
			var oJSONModel = new JSONModel();
			oJSONModel.setData({
				rows: this._dataModels[item.getKey()].results
			});
			this.byId("valueTable").setModel(oJSONModel);
			this._updateRowCount();
		},
		_prepareSave: function () {
			var oObj = {};
			oObj.Planned = this.byId("planned").getState();
			oObj.CalendarWeek = this.byId("calendarWeek").getValue();
			oObj.Project = this.byId("project").getValue();
			oObj.Jira = this.byId("jira").getValue();
			oObj.Spec = this.byId("spec").getValue();
			oObj.Priority = this.byId("priority").getValue();
			oObj.System = [];
			this.byId("systemMulti").getTokens().forEach(token => oObj.System.push({
				Name: token.getText().toUpperCase()
			}));
			oObj.Transport = [];
			this.byId("transportMulti").getTokens().forEach(token => oObj.Transport.push({
				Name: token.getText()
			}));

			oObj.Comment = [{
				Name: this.byId("comment").getValue()
			}];
			oObj.Changer = "Andreas Köhler";
			oObj.ChangingDate = moment().format("DD.MM.YYYY HH:mm:ss");
			return oObj;
		},
		onSaveButtonClick: function (oEvent) {
			if (this._checkFormEntries()) {
				this.byId("valueTable").setBusy(true);
				var oObj = this._prepareSave();
				var employee = this.byId("employeeSelectD");

				oObj.Category = this.byId("crCategoryCombo").getValue();
				oObj.Area = this.byId("crAreaCombo").getValue();
				oObj.Task = this.byId("crTaskCombo").getValue();
				oObj.BC = this.byId("crBCCombo").getValue();
				oObj.Status = this.byId("crStatusCombo").getValue();
				oObj.Begin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				oObj.RealBegin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				oObj.End = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());
				oObj.RealEnd = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());

				oObj.Creator = "Andreas Köhler";
				oObj.CreationDate = moment().format("DD.MM.YYYY HH:mm:ss");
				this._dataModels[employee.getSelectedKey()].results.push(oObj);
				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: this._dataModels[employee.getSelectedKey()].results
				});
				this.byId("valueTable").setModel(oJSONModel);
				this._updateRowCount();
				MessageToast.show(this._oI18n.getText("messageSuccessfullCreated"));
				this.byId("valueTable").setBusy(false);
			}
		},
		onSaveChanges: function (oControlEvent) {
			if (this._checkFormEntries()) {
				this.byId("valueTable").setBusy(true);
				var oObj = this._prepareSave(),
					oEmployee = this.byId("employeeSelectD");
				oObj.Category = this.byId("editCategory").getValue();
				oObj.Area = this.byId("editArea").getValue();
				oObj.Task = this.byId("editTask").getValue();
				oObj.BC = this.byId("editBC").getValue();
				oObj.Status = this.byId("editStatus").getValue();
				oObj.Begin = Formatter._formatDate(this.byId("editBegin").getDateValue());
				oObj.RealBegin = Formatter._formatDate(this.byId("editRealBegin").getDateValue());
				oObj.End = Formatter._formatDate(this.byId("editEnd").getDateValue());
				oObj.RealEnd = Formatter._formatDate(this.byId("editRealEnd").getDateValue());
				oObj.Estimation = this.byId("estimation").getValue();
				oObj.Creator = this.byId("entryDialog").getModel().getData().Creator;
				oObj.CreationDate = this.byId("entryDialog").getModel().getData().CreationDate;

				this._dataModels[oEmployee.getSelectedKey()].results[this._rowIndex] = oObj;
				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: this._dataModels[oEmployee.getSelectedKey()].results
				});
				this.byId("valueTable").setModel(oJSONModel);
				this._updateRowCount();
				this.byId("valueTable").setBusy(false);
				MessageToast.show(this._oI18n.getText("messageSuccessfullEdited"));
				this.byId("valueTable").setBusy(false);
				this.byId("entryDialog").close();
			}
		},
		_checkFormEntries: function () {
			if (!this.byId("crCategoryCombo").getValue() && !this.byId("editCategory").getValue() ||
				!this.byId("crAreaCombo").getValue() && !this.byId("editArea").getValue() ||
				!this.byId("calendarWeek").getValue() ||
				!this.byId("crTaskCombo").getValue() && !this.byId("editTask").getValue() ||
				!this.byId("crStatusCombo").getValue() && !this.byId("editStatus").getValue() ||
				!this.byId("project").getValue() ||
				!this.byId("jira").getValue() ||
				!this.byId("spec").getValue() ||
				!this.byId("crBCCombo").getValue() && !this.byId("editBC").getValue() ||
				!this.byId("priority").getValue() ||
				((!this.byId("crTimerange").getDateValue() || !this.byId("crTimerange").getSecondDateValue()) && !(this.byId("editBegin").getValue() &&
					this.byId("editRealBegin").getValue() && this.byId("editEnd").getValue() && this.byId("editRealEnd").getValue())) ||
				!this.byId("estimation").getValue() ||
				this.byId("systemMulti").getTokens().length <= 0 ||
				this.byId("transportMulti").getTokens().length <= 0 ||
				!this.byId("comment").getValue()) {
				MessageBox.error(this._oI18n.getText("messageEmptyFields"), {
					title: this._oI18n.getText("error")
				});
				return false;
			}
			var hadError = false;
			this.byId("calendarWeek").setValueState("None");
			if (!this._appController.isNumeric(this.byId("calendarWeek").getValue()) ||
				parseInt(this.byId("calendarWeek").getValue(), 10) < 1 ||
				parseInt(this.byId("calendarWeek").getValue(), 10) > 52) {
				hadError = true;
				this.byId("calendarWeek").setValueState("Error");
			}
			this.byId("crTimerange").setValueState("None");
			this.byId("editBegin").setValueState("None");
			this.byId("editRealBegin").setValueState("None");
			this.byId("editEnd").setValueState("None");
			this.byId("editRealEnd").setValueState("None");
			if ((!this.byId("crTimerange").getDateValue() || !this.byId("crTimerange").getSecondDateValue()) && !(this.byId("editBegin").getValue() &&
					this.byId("editRealBegin").getValue() && this.byId("editEnd").getValue() && this.byId("editRealEnd").getValue())) {
				hadError = true;
				this.byId("crTimerange").setValueState("Error");
				this.byId("editEnd").setValueState("Error");
				this.byId("editRealEnd").setValueState("Error");
				this.byId("editBegin").setValueState("Error");
				this.byId("editRealBegin").setValueState("Error");
			}
			if (hadError) {
				MessageBox.error(this._oI18n.getText("messageWrongDates"), {
					title: this._oI18n.getText("error")
				});
				return false;
			}

			this.byId("transportMulti").setValueState("None");
			this.byId("systemMulti").setValueState("None");
			if (this.byId("systemMulti").getTokens().length !== this.byId("transportMulti").getTokens().length) {
				this.byId("transportMulti").setValueState("Error");
				this.byId("systemMulti").setValueState("Error");
				MessageBox.error(this._oI18n.getText("messageWrongDates"), {
					title: this._oI18n.getText("error")
				});
				return false;
			}
			return true;
		},
		onCreationButtonClick: function (oEvent) {
			this._prepareDialog(false);
			if (!this.byId("entryDialog").getVisible()) {
				this.byId("entryDialog").setVisible(true);
			}
			this.byId("entryDialog").open();
		},
		onEditClick: function (oControlEvent) {
			this._extractRowIndex(oControlEvent.getSource().getParent().getBindingContextPath());
		},
		_extractRowIndex: function (bindingPath) {
			this._rowIndex = bindingPath.substr(bindingPath.lastIndexOf("/") + 1);
			this._openEntryDialog(this._rowIndex);
		},
		_openEntryDialog: function (rowIndex) {
			var oDialogModel = new JSONModel(this._appController.clone(this.byId("valueTable").getModel().getData().rows[
				rowIndex]));
			oDialogModel.getData().Employee = this.byId("employeeSelect").getSelectedItem().getKey();
			this.byId("entryDialog").setModel(oDialogModel);
			this._prepareDialog(true);
			if (!this.byId("entryDialog").getVisible()) {
				this.byId("entryDialog").setVisible(true);
			}
			this.byId("entryDialog").open();
		},
		_prepareDialog: function (edit) {
			this.byId("editBCElement").setVisible(edit);
			this.byId("crBCElement").setVisible(!edit);
			this.byId("editCategoryElement").setVisible(edit);
			this.byId("crCategoryElement").setVisible(!edit);
			this.byId("editTaskElement").setVisible(edit);
			this.byId("crTaskElement").setVisible(!edit);
			this.byId("editAreaElement").setVisible(edit);
			this.byId("crAreaElement").setVisible(!edit);
			this.byId("editStatusElement").setVisible(edit);
			this.byId("crStatusElement").setVisible(!edit);
			this.byId("crTimeRangeElement").setVisible(!edit);
			this.byId("editBeginElement").setVisible(edit);
			this.byId("editRealBeginElement").setVisible(edit);
			this.byId("editEndElement").setVisible(edit);
			this.byId("editRealEndElement").setVisible(edit);
			this.byId("createButton").setVisible(!edit);
			this.byId("saveButton").setVisible(edit);
			if (!edit) {
				this.byId("entryDialog").setModel(new JSONModel());
			}
		},
		onCancelChanges: function (oControlEvent) {
			this.byId("entryDialog").close();
		}
	});
});