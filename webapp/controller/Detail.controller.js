/* eslint-disable no-console, max-params, sap-timeout-usage, sap-no-hardcoded-url*/
/* eslint complexity: [error, 19] */
/* global koehler:true, moment:true, Set:true */
(function () {
	jQuery.sap.declare("koehler.T2000.Formatter");
	jQuery.sap.require("sap.ui.base.Object");

	sap.ui.base.Object.extend("koehler.T2000.Formatter", {});

	koehler.T2000.Formatter._formatDate = function (oDate) {
		this._formatDate(oDate, false);
	};

	koehler.T2000.Formatter._formatDate = function (oDateParam, withWeekDay) {
		var oOptions = {
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		};
		if (withWeekDay) {
			oOptions.weekday = "long";
		}
		if (oDateParam) {
			var oDate = oDateParam;
			if (!(oDateParam instanceof Date)) {
				oDate = new Date(oDate);
			}
			return oDate.toLocaleDateString("de-de", oOptions);
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
			this._oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this.getView().setBusyIndicatorDelay(0);

			this._addValidator(this.byId("crSystemMulti"));
			this._addValidator(this.byId("crTransportMulti"));

			this._registerGlobals();
			this._readCurrentUser(this._oDataModel);
			this._load();
		},
		_load: async function () {
			console.log("Loading");
			const result = await this._loader();
			console.log(result);
		},
		_loader: function () {
			var that = this;
			var oView = this.getView();
			oView.setBusy(true);
			return new Promise(function (resolved, rejected) {
				setTimeout(function () {
					that._fillData();
					that._fillTestData(500);
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
			this._webUrl = "https://schwarzit.sharepoint.com/";
			this._apiUrl = "https://schwarzit.sharepoint.com/_api";
			this._oDataModel = new ODataModel(this._apiUrl + "/", {
				json: true,
				useBatch: false,
				headers: {
					"Cache-Control": "max-age=0",
					"X-CSRF-Token": "Fetch"
				}
			});
			this._columnNames = [];
			this.byId("valueTable").getColumns().forEach(column => {
				this._columnNames.push(column.getHeader().getText());
			});
			this._columnIds = ["Category", "Area", "Planned", "CalendarWeek", "Task", "Project", "Jira", "Spec", "BC", "Status", "Begin",
				"RealBegin", "End", "RealEnd", "Priority", "System", "Transport", "Comment", "Creator", "CreationDate", "Changer", "ChangingDate"
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
		_readCurrentUser: function (oDataModel) {
			var sPath = "/web/currentuser";
			// debugger;
			const userData = {
				Title: "",
				Id: 0,
				UserId: {
					nameId: "",
					nameIdIssuer: ""
				},
				eMail: ""
			};
			var userDataObj = Object.create(userData);
			oDataModel.read(
				sPath, {
					success: function (oData) {
						// debugger;
						console.log(oData);
						userDataObj.Title = oData.Title;
						userDataObj.Id = oData.Id;
						userDataObj.eMail = oData.Email;
						userDataObj.Id = oData.Id;
						this._onReadCurrentUserSuccess(userDataObj, oDataModel);
					}.bind(this),
					error: function (oError) {
						// debugger;
						console.log(oError);
						this._showErrorMessageBox(oError);
					}.bind(this)
				});
		},
		_readCurrentUserSuccess: function (userDataObj, oDataModel) {
			var sPath = "Jesus Christus liebt dich und wird dich richten!";
			sPath = "/web/lists('FC64A472-2684-4901-88EF-1D9FED7086D5')/items"; //Mitarbeiter-Liste
			oDataModel.read(
				sPath, {
					urlParameters: {
						$filter: "MitarbeiterId eq " + userDataObj.Id
					},
					success: function (oData) {
						for (let i = 0; i < oData.results.length; i++) {
							userDataObj.TeamId.push(oData.results[i].TeamId);
							if (!userDataObj.isTeamLeader && oData.results[i].Teamleiter) {
								userDataObj.isTeamLeader = oData.results[i].Teamleiter;
							}
						}
						this._userData = userDataObj;
					}.bind(this),
					error: function (oError) {
						console.log(oError);
					}.bind(this)
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
		_uniqBy: function (a, key) {
			let seen = new Set();
			return a.filter(item => {
				let k = key(item);
				return seen.has(k) ? false : seen.add(k);
			});
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
			for (i = 0; i < aArr.Names.length; i++) {
				aArr.Names[this._columnIds[i]].Items = this._uniqBy(aArr.Names[this._columnIds[i]].Items, JSON.stringify);
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
			this.byId("crStatusCombo").setModel(this._getModelForArray(this._status, ""));
			this.byId("crCategoryCombo").setModel(this._getModelForArray(this._categories, ""));
			this.byId("crAreaCombo").setModel(this._getModelForArray(this._areas, ""));
			this.byId("crTaskCombo").setModel(this._getModelForArray(this._tasks, ""));
			this.byId("crBCCombo").setModel(this._getModelForArray(this._bcs, ""));

			var oFilterDialog = this._createDialog("koehler.T2000.fragment.FilterDialog");
			oFilterDialog.setModel(this.getOwnerComponent().getModel("i18n"), "i18n");

			var oSortDialog = this._createDialog("koehler.T2000.fragment.SortDialog");
			oSortDialog.setModel(this._getModelForArray(this._columnNames, ""));

			var oGroupDialog = this._createDialog("koehler.T2000.fragment.GroupDialog");
			oGroupDialog.setModel(this._getModelForArray(this._columnNames, ""));
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
		_getTestModel: function (num, employee) {
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
					results: that._getTestModel(num, item.getText())
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
		onSaveButtonClick: function (oEvent) {
			if (this._checkIfFormFilled()) {
				var oRowData = this.byId("valueTable").getModel().getData();
				var oObj = {};
				oObj.Category = this.byId("crCategoryCombo").getValue();
				oObj.Area = this.byId("crAreaCombo").getValue();
				oObj.Planned = this.byId("crPlanned").getState();
				oObj.CalendarWeek = this.byId("crCalendarWeek").getValue();
				oObj.Task = this.byId("crTaskCombo").getValue();
				oObj.Project = this.byId("crProject").getValue();
				oObj.Jira = this.byId("crJira").getValue();
				oObj.Spec = this.byId("crSpec").getValue();
				oObj.BC = this.byId("crBCCombo").getValue();
				oObj.Status = this.byId("crStatusCombo").getValue();
				oObj.Begin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				oObj.RealBegin = Formatter._formatDate(this.byId("crTimerange").getDateValue());
				oObj.End = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());
				oObj.RealEnd = Formatter._formatDate(this.byId("crTimerange").getSecondDateValue());
				oObj.Priority = this.byId("crPriority").getValue();

				oObj.System = [];
				this.byId("crSystemMulti").getTokens().forEach(token => oObj.System.push({
					Name: token.getText().toUpperCase()
				}));
				oObj.Transport = [];
				this.byId("crTransportMulti").getTokens().forEach(token => oObj.Transport.push({
					Name: token.getText()
				}));

				oObj.Comment = this.byId("crComment").getValue();
				oObj.Creator = "Andreas Köhler";
				oObj.CreationDate = moment().format("DD.MM.YYYY HH:mm:ss");
				oObj.Changer = "Andreas Köhler";
				oObj.ChangingDate = moment().format("DD.MM.YYYY HH:mm:ss");
				oRowData.rows.push(oObj);

				var oJSONModel = new JSONModel();
				oJSONModel.setData({
					rows: oRowData.rows
				});
				this.byId("valueTable").setModel(oJSONModel);
				this._updateRowCount();
				this.byId("tabs").setSelectedKey(0);
				this.byId("createButton").setVisible(false);
				this.byId("backlogButton").setVisible(true);
				MessageToast.show(this._oI18n.getText("messageSuccessfullCreated"));
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
				MessageBox.error(this._oI18n.getText("messageEmptyFields"), {
					title: this._oI18n.getText("error")
				});
				return false;
			}
			if (!this._isNumeric(this.byId("crCalendarWeek").getValue()) ||
				parseInt(this.byId("crCalendarWeek").getValue(), 10) < 1 ||
				!this.byId("crTimerange").getDateValue() ||
				!this.byId("crTimerange").getSecondDateValue() ||
				parseInt(this.byId("crCalendarWeek").getValue(), 10) > 52) {
				MessageBox.error(this._oI18n.getText("messageWrongDates"), {
					title: this._oI18n.getText("error")
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