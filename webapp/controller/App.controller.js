/* eslint-disable no-console */
/*global koehler:true, Set:true */
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
	"sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
	"use strict";

	return Controller.extend("koehler.T2000.controller.App", {
		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			if (jQuery.sap.getUriParameters().get("num") !== null) {
				oRouter.navTo("SelectionP", {
					num: jQuery.sap.getUriParameters().get("num")
				}, true);
			} else {
				oRouter.navTo("Selection", null, true);
			}
		},
		clone: function (obj) {
			var copy;

			if (obj === null || typeof obj !== "object") {
				return obj;
			}

			if (obj instanceof Date) {
				copy = new Date();
				copy.setTime(obj.getTime());
				return copy;
			}

			if (obj instanceof Array) {
				copy = [];
				for (var i = 0, len = obj.length; i < len; i++) {
					copy[i] = this._clone(obj[i]);
				}
				return copy;
			}

			if (obj instanceof Object) {
				copy = {};
				for (var attr in obj) {
					if (obj.hasOwnProperty(attr)) {
						copy[attr] = this._clone(obj[attr]);
					}
				}
				return copy;
			}

			throw new Error("Object couldnt be cloned!");
		},
		isNumeric: function (str) {
			if (typeof str !== "string" && typeof str !== "number") {
				return false;
			}
			return !isNaN(str) && !isNaN(parseFloat(str));
		},
		getModelForArray: function (arr, firstElementText) {
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
					}
				});
		},
		uniqBy: function (a, key) {
			let seen = new Set();
			return a.filter(item => {
				let k = key(item);
				return seen.has(k) ? false : seen.add(k);
			});
		}
	});

});