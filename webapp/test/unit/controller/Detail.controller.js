/*global QUnit*/

sap.ui.define([
	"koehler/T2000/controller/Detail.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Detail Controller");

	QUnit.test("I should test the Detail controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});