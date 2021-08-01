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
			this._oAppController = sap.ui.controller("koehler.T2000.controller.App");
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
			this._load(oEvent.getParameter("arguments").num);
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
			this._aColumnNames = [];
			var that = this;
			if (sap.ui.Device.support.touch) {
				this.byId("valueTable").attachBrowserEvent("tap", function (oEvent) {
					try {
						that._extractRowIndex(sap.ui.getCore().byId($("#" + oEvent.target.id).parent()[0].id).getBindingContextPath());
						that._openEntryDialog(that._nRowIndex);
					} catch (e) {
						console.warn("Editing is just available when pressing on a Row!");
						// console.error(e);
					}
				});
			} else {
				this.byId("valueTable").attachBrowserEvent("dblclick", function (oEvent) {
					try {
						that._extractRowIndex(sap.ui.getCore().byId($("#" + oEvent.toElement.id).parent()[0].id).getBindingContextPath());
						that._openEntryDialog(that._nRowIndex);
					} catch (e) {
						console.warn("Editing is just available when pressing on a Row!");
						// console.error(e);
					}
				});
			}
			sap.ui.Device.resize.attachHandler(function (oEvent) {
				that.byId("headerBar").setWidth($(window).width() + "px");
				that.byId("filterBar").setWidth($(window).width() + "px");
			});
			this.byId("valueTable").getColumns().forEach(column => {
				this._aColumnNames.push(column.getHeader().getText());
			});
			this._aColumnIds = ["Category", "Area", "Planned", "CalendarWeek", "Task", "Project", "Jira", "Spec", "BC", "Status",
				"Begin", "RealBegin", "End", "RealEnd", "Estimation", "Priority", "System", "Transport", "Comment", "Creator", "CreationDate",
				"Changer", "ChangingDate"
			];
			this._aDateColumns = ["Begin", "RealBegin", "End", "RealEnd", "CreationDate", "ChangingDate"];
			this._aHiddenColumns = [];
			var aColumns = this.byId("valueTable").getColumns();
			for (var i = 0; i < aColumns.length; i++) {
				if (!aColumns[i].getVisible()) {
					this._aHiddenColumns.push({
						ID: this._aColumnIds[i],
						Name: this._aColumnNames[i]
					});
				}
			}
			this._aHiddenColumns.push({
				ID: "ProjectType",
				Name: "ProjectType"
			});
			this._aAreas = ["Abwesenheit", "Organisation", "Produkt", "Anforderung"];
			this._aCategories = ["Testkategorie", "Timebox", "Task"];
			this._aTasks = ["Krankheit, Urlaub, Teilzeit", "Schulung, Ausbildung", "Team- und eigene Orga", "Incidents/Problems/Support",
				"PreZero", "VZ-Dispo 2020", "PreBull", "BBY", "S4HANA"
			];
			this._aBcs = ["Silke Wünsch", "Amine Abida", "Emanuel", "Andreas", "Mike", "Sonstige"];
			this._aStatus = ["Backlog", "Umsetzung", "Analyse", "Begleitung"];
			this._oDialogs = {};
			this._oGroupFunctions = {};
			this._aColumnIds.forEach(id => {
				this._oGroupFunctions[id] = function (oContext) {
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
			oTitle.setText(this._getRowCount());
			// this._updateFilterModel();
		},
		_getRowCount: function () {
			return this.byId("valueTable").getBinding("items").getLength();
		},
		_createDialog: function (fragmentName) {
			var oDialog = this._oDialogs[fragmentName];

			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(fragmentName, this);
				this._oDialogs[fragmentName] = oDialog;
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
			for (var i = 0; i < this._aColumnIds.length; i++) {
				aArr.Names[this._aColumnIds[i]] = {
					Key: this._aColumnIds[i],
					Value: this._aColumnNames[i],
					Items: []
				};
			}
			aRows.forEach(row => {
				var aEntries = Object.entries(row);
				aEntries.splice(aEntries.findIndex(function findeTyp(aTyp) {
					return aTyp[0] === "ProjectType";
				}), 1);
				for (var j = 0; j < aEntries.length; j++) {
					if (!Array.isArray(aEntries[j][1])) {
						aArr.Names[this._aColumnIds[j]].Items.push({
							Key: this._aColumnIds[j],
							Name: aEntries[j][1]
						});
					} else {
						for (var k = 0; k < aEntries[j][1].length; k++) {
							aArr.Names[this._aColumnIds[j]].Items.push({
								Key: this._aColumnIds[j],
								Name: aEntries[j][1][k].Name
							});
						}
					}
				}
			});
			for (i = 0; i < Object.entries(aArr.Names).length; i++) {
				aArr.Names[this._aColumnIds[i]].Items = this._oAppController.uniqBy(aArr.Names[this._aColumnIds[i]].Items, JSON.stringify);
			}
			for (i = 0; i < this._aDateColumns.length; i++) {
				aArr.Names[this._aDateColumns[i]].Items = [{
					Key: this._aDateColumns[i] + "___7___days",
					Name: this._oI18n.getText("lastWeek")
				}, {
					Key: this._aDateColumns[i] + "___1___months",
					Name: this._oI18n.getText("lastMonth")
				}, {
					Key: this._aDateColumns[i] + "___3___months",
					Name: this._oI18n.getText("lastThreeMonths")
				}, {
					Key: this._aDateColumns[i] + "___6___months",
					Name: this._oI18n.getText("lastSixMonths")
				}, {
					Key: this._aDateColumns[i] + "___1___year",
					Name: this._oI18n.getText("lastYear")
				}];
			}
			this._aHiddenColumns.forEach(col => {
				delete aArr.Names[col.ID];
			});
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
				aGroups.push(new Sorter(sPath, mParams.groupDescending, this._oGroupFunctions[this._getColIdForIndex(sPath)]));
				oTable.getBinding("items").sort(aGroups);
			} else {
				oTable.getBinding("items").sort();
			}
		},
		onSortDialogConfirm: function (oEvent) {
			var mParams = oEvent.getParameters(),
				aSorters = [],
				colId = this._getColIdForIndex(mParams.sortItem.getKey());
			if (!this._aDateColumns.includes(colId)) {
				aSorters.push(new Sorter(colId, mParams.sortDescending));
			} else {
				aSorters.push(new Sorter(colId, mParams.sortDescending, false, function (val1, val2) {
					var d1 = moment(val1, "DD.MM.yyyy"),
						d2 = moment(val2, "DD.MM.yyyy");
					if (d1.isBefore(d2)) {
						return -1;
					} else if (d1.isAfter(d2)) {
						return 1;
					} else {
						return 0;
					}
				}));
			}
			this.byId("valueTable").getBinding("items").sort(aSorters);
		},
		_getColIdForIndex: function (index) {
			return this._aColumnIds[index];
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
								if (that._aDateColumns.includes(sPath)) {
									return moment(oValue, "DD.MM.yyyy").isBetween(moment().subtract(aSplit[2], aSplit[3]), moment(), undefined, "[]");
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
								var aEntries = Object.entries(oValue);
								for (var i = 0; i < aEntries.length; i++) {
									if (that._includes(that._aHiddenColumns, "ID", aEntries[i][0])) {
										continue;
									}
									if (!Array.isArray(aEntries[i][1])) {
										if (aEntries[i][1].toString().toLocaleLowerCase().includes(sQuery.toString().toLocaleLowerCase())) {
											return true;
										}
									} else {
										for (var j = 0; j < aEntries[i][1].length; j++) {
											if (aEntries[i][1][j].Name.toString().toLocaleLowerCase().includes(sQuery.toString().toLocaleLowerCase())) {
												return true;
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
			this.byId("crStatusCombo").setModel(this._oAppController.getModelForArray(this._aStatus, ""));
			this.byId("crCategoryCombo").setModel(this._oAppController.getModelForArray(this._aCategories, ""));
			this.byId("crAreaCombo").setModel(this._oAppController.getModelForArray(this._aAreas, ""));
			this.byId("crTaskCombo").setModel(this._oAppController.getModelForArray(this._aTasks, ""));
			this.byId("crBCCombo").setModel(this._oAppController.getModelForArray(this._aBcs, ""));

			var oFilterDialog = this._createDialog("koehler.T2000.fragment.FilterDialog");
			oFilterDialog.setModel(this.getOwnerComponent().getModel("i18n"), "i18n");

			var oSortDialog = this._createDialog("koehler.T2000.fragment.SortDialog"),
				aFiltered = [],
				that = this;
			this._aColumnNames.forEach(col => {
				if (!that._includes(that._aHiddenColumns, "Name", col)) {
					aFiltered.push(col);
				}
			});
			oSortDialog.setModel(this._oAppController.getModelForArray(aFiltered, ""));

			var oGroupDialog = this._createDialog("koehler.T2000.fragment.GroupDialog");
			oGroupDialog.setModel(this._oAppController.getModelForArray(aFiltered, ""));
		},
		_includes: function (arr, prop, val) {
			var bRet = false;
			arr.forEach(entry => {
				if (entry[prop] === val) {
					bRet = true;
				}
			});
			return bRet;
		},
		onEmployeeSelect: function (oControlEvent) {
			this.byId("filterBar").setVisible(false);
			this._updateData(oControlEvent.getParameters().selectedItem);
		},
		onBacklogButtonClick: function (oEvent) {
			var oEventOwn = {},
				oI18n = this._oI18n;
			oEventOwn.getParameters = function () {
				var oParams = {};
				oParams.filterItems = [{
					getKey: function () {
						return oI18n.getText("backlog") + "___Status";
					}
				}];
				oParams.filterString = oI18n.getText("filteredBy") + ": Status (" + oI18n.getText("backlog") + ")";
				return oParams;
			};
			this.onFilterDialogConfirm(oEventOwn);
		},
		_getTestData: function (num, employee) {
			var oData = new Array(num),
				aProjects = [{
					Name: "P096",
					Type: "pm_project_list.do?sysparm_query=u_project_number_on_task="
				}, {
					Name: "AP009153",
					Type: "u_sdur_task_list.do?sysparm_query=number="
				}, {
					Name: "PRJ001269",
					Type: "pm_project_list.do?sysparm_query=number="
				}];

			for (var i = 0; i < num; i++) {
				oData[i] = {};
				oData[i].Category = this._aCategories[this._aCategories.length * Math.random() | 0];
				oData[i].Area = this._aAreas[this._aAreas.length * Math.random() | 0];
				oData[i].Planned = Math.floor(Math.random() * 2) === 1;
				oData[i].CalendarWeek = Math.floor(Math.random() * 52) + 1;
				oData[i].Task = this._aTasks[this._aTasks.length * Math.random() | 0];
				oData[i].Project = aProjects[i % 3].Name + parseInt(i / 3, 10);
				oData[i].ProjectType = aProjects[i % 3].Type;
				oData[i].Jira = "FXDFKA-191" + i;
				oData[i].Spec = "009824" + i;
				oData[i].BC = this._aBcs[this._aBcs.length * Math.random() | 0];
				oData[i].Status = this._aStatus[this._aStatus.length * Math.random() | 0];
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
					Name: "Lorem ipsum dolor sit amet, consectetur adipisici elit, sed eiusmod tempor incidunt ut labore " +
						"et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut " +
						"aliquid ex ea commodi consequat. Quis aute iure reprehenderit in voluptate velit esse cillum dolore " +
						"eu fugiat nulla pariatur. Excepteur sint obcaecat cupiditat non proident, sunt in culpa qui officia " +
						"deserunt mollit anim id est laborum."
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
			this._aDataModels = {};
			this.byId("employeeSelect").getItems().forEach(item => {
				this._aDataModels[item.getKey()] = {
					employee: item.getText(),
					results: that._getTestData(num, item.getText())
				};
			});
			this._updateData(this.byId("employeeSelect").getFirstItem());
		},
		_updateData: function (item) {
			var oJSONModel = new JSONModel();
			oJSONModel.setData({
				rows: this._aDataModels[item.getKey()].results
			});
			this.byId("valueTable").setModel(oJSONModel);
			this._updateRowCount();
		},
		_prepareSave: function () {
			var oObj = {};
			oObj.Planned = this.byId("planned").getState();
			oObj.CalendarWeek = this.byId("calendarWeek").getValue();
			oObj.Project = this.byId("project").getValue();
			oObj.ProjectType = this.byId("projectTypeSelect").getSelectedItem().getText();
			oObj.Jira = this.byId("jira").getValue();
			oObj.Spec = this.byId("spec").getValue();
			if (oObj.Spec.toLowerCase().startsWith("spec")) {
				oObj.Spec = oObj.Spec.substring(4);
			}
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
				var oEmployee = this.byId("employeeSelectD");

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
				this._aDataModels[oEmployee.getSelectedKey()].results.push(oObj);
				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: this._aDataModels[oEmployee.getSelectedKey()].results
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

				this._aDataModels[oEmployee.getSelectedKey()].results[this._nRowIndex] = oObj;
				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: this._aDataModels[oEmployee.getSelectedKey()].results
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
				!this.byId("projectTypeSelect").getSelectedItem().getText() ||
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
			var bHadError = false;
			this.byId("calendarWeek").setValueState("None");
			if (!this._oAppController.isNumeric(this.byId("calendarWeek").getValue()) ||
				parseInt(this.byId("calendarWeek").getValue(), 10) < 1 ||
				parseInt(this.byId("calendarWeek").getValue(), 10) > 52) {
				bHadError = true;
				this.byId("calendarWeek").setValueState("Error");
			}
			this.byId("crTimerange").setValueState("None");
			this.byId("editBegin").setValueState("None");
			this.byId("editRealBegin").setValueState("None");
			this.byId("editEnd").setValueState("None");
			this.byId("editRealEnd").setValueState("None");
			if ((!this.byId("crTimerange").getDateValue() || !this.byId("crTimerange").getSecondDateValue()) && !(this.byId("editBegin").getValue() &&
					this.byId("editRealBegin").getValue() && this.byId("editEnd").getValue() && this.byId("editRealEnd").getValue())) {
				bHadError = true;
				this.byId("crTimerange").setValueState("Error");
				this.byId("editEnd").setValueState("Error");
				this.byId("editRealEnd").setValueState("Error");
				this.byId("editBegin").setValueState("Error");
				this.byId("editRealBegin").setValueState("Error");
			}
			if (bHadError) {
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
				MessageBox.error(this._oI18n.getText("messageTransportSystemMismatch"), {
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
			this.byId("entryDialog").setTitle(this._oI18n.getText("new"));
			this.byId("entryDialog").open();
		},
		onEditClick: function (oControlEvent) {
			this._extractRowIndex(oControlEvent.getSource().getParent().getBindingContextPath());
			this._openEntryDialog(this._nRowIndex);
		},
		_extractRowIndex: function (bindingPath) {
			this._nRowIndex = bindingPath.substr(bindingPath.lastIndexOf("/") + 1);
		},
		_openEntryDialog: function (rowIndex) {
			var oDialogModel = new JSONModel(this._oAppController.clone(this.byId("valueTable").getModel().getData().rows[
				rowIndex]));
			oDialogModel.getData().Employee = this.byId("employeeSelect").getSelectedItem().getKey();
			this.byId("entryDialog").setModel(oDialogModel);
			this.byId("entryDialog").setTitle(this._oI18n.getText("edit"));
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