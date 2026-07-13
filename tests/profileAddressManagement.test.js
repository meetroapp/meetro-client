import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { t } from "../src/utils/language.js";

const profileSource = fs.readFileSync("src/pages/Profile.jsx", "utf8");
const managerSource = fs.readFileSync("src/components/PersonalAddressManager.jsx", "utf8");
const uploadSource = fs.readFileSync("src/pages/Upload.jsx", "utf8");
const emergencySource = fs.readFileSync("src/pages/EmergencyRequest.jsx", "utf8");
const scheduleSource = fs.readFileSync("src/pages/ContractorDashboard.jsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");

test("User Profile replaces the Manage Addresses placeholder with the shared workspace", () => {
  const manageBlock = profileSource.slice(profileSource.indexOf('label={t("manageAddresses")}'), profileSource.indexOf('label={t("paymentMethods")}'));
  assert.match(manageBlock, /onClick=\{\(\) => setAddressManagerOpen\(true\)\}/);
  assert.doesNotMatch(manageBlock, /comingSoon|disabled/);
  assert.match(profileSource, /<PersonalAddressManager/);
  assert.match(profileSource, /readPersonalAddresses/);
});

test("address manager follows one viewport-owned accessible editor pattern", () => {
  assert.match(managerSource, /role="dialog"/);
  assert.match(managerSource, /aria-modal="true"/);
  assert.match(managerSource, /aria-labelledby="address-manager-title"/);
  assert.match(managerSource, /event\.key !== "Escape"/);
  assert.match(managerSource, /htmlFor=\{id\}/);
  assert.match(managerSource, /aria-invalid/);
  assert.match(cssSource, /\.meetro-address-workspace/);
  assert.match(cssSource, /env\(safe-area-inset-bottom/);
  assert.match(cssSource, /max-height: calc\(100dvh/);
  assert.match(cssSource, /overflow-y: auto/);
});

test("request and emergency use personal address only through fallback precedence", () => {
  assert.match(uploadSource, /resolveWorkflowAddress\(\{/);
  assert.match(uploadSource, /selectedPropertyAddress:/);
  assert.match(uploadSource, /projectAddress:/);
  assert.match(uploadSource, /requestAddress:/);
  assert.match(emergencySource, /explicitAddress: localStorage\.getItem\("emergencyLocation"\)/);
  assert.match(emergencySource, /location: emergencyLocation/);
});

test("professional schedule retains customer and visit address ownership", () => {
  assert.match(scheduleSource, /getScheduleVisitLocation\(\{\s*customerAddress: manualCustomerAddress,\s*overrideLocation: scheduleForm\.location/);
  assert.match(scheduleSource, /customerAddress:\s*manualCustomerContact\?\.address \|\|\s*manualCustomerAddress/);
  assert.doesNotMatch(scheduleSource, /resolveDefaultPersonalAddress|readPersonalAddresses/);
});

test("address labels are present in every supported language", () => {
  const keys = [
    "manageAddresses", "savedAddresses", "addAddress", "editAddress", "deleteAddress",
    "setAsDefault", "defaultAddress", "addressLabel", "streetAddress", "apartmentUnit",
    "city", "state", "zipCode", "country", "addressLabelHome", "addressLabelWork",
    "addressLabelRental", "addressLabelOther", "saveAddress", "cancel", "addressRequired",
    "cityRequired", "stateRequired", "postalCodeRequired", "countryRequired", "noSavedAddresses",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) assert.notEqual(t(key, language), key, `${language}:${key}`);
  }
});
