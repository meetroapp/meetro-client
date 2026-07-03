import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const messagesSource = fs.readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const nativeContactsSource = fs.readFileSync(
  new URL("../src/utils/nativeContacts.js", import.meta.url),
  "utf8"
);
const swiftSource = fs.readFileSync(
  new URL("../ios/App/App/NativeContacts.swift", import.meta.url),
  "utf8"
);
const mainViewControllerSource = fs.readFileSync(
  new URL("../ios/App/App/MainViewController.swift", import.meta.url),
  "utf8"
);
const infoPlistSource = fs.readFileSync(
  new URL("../ios/App/App/Info.plist", import.meta.url),
  "utf8"
);
const xcodeProjectSource = fs.readFileSync(
  new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url),
  "utf8"
);

test("iOS native Contacts plugin requests permission and returns contact records", () => {
  assert.match(swiftSource, /import Contacts/);
  assert.match(swiftSource, /@objc\(NativeContacts\)/);
  assert.match(swiftSource, /CNContactStore\(\)/);
  assert.match(swiftSource, /requestAccess\(for: \.contacts\)/);
  assert.match(swiftSource, /enumerateContacts\(with: request\)/);
  assert.match(swiftSource, /"permission": "granted"/);
  assert.match(swiftSource, /"source": "phone"/);
});

test("native Contacts plugin is registered and allowed by iOS permissions", () => {
  assert.match(mainViewControllerSource, /registerPluginInstance\(NativeContacts\(\)\)/);
  assert.match(infoPlistSource, /NSContactsUsageDescription/);
  assert.match(
    infoPlistSource,
    /import existing customers, tenants, vendors, employees, and business contacts into Messages/
  );
  assert.match(xcodeProjectSource, /NativeContacts\.swift in Sources/);
});

test("Messages phone contact import uses native iPhone contacts before web fallback", () => {
  const nativeIndex = messagesSource.indexOf("isNativeContactsAvailable()");
  const webFallbackIndex = messagesSource.indexOf("navigator.contacts");

  assert.ok(nativeIndex >= 0);
  assert.ok(webFallbackIndex > nativeIndex);
  assert.match(messagesSource, /getNativePhoneContacts\(\)/);
  assert.match(messagesSource, /CONTACTS_ACCESS_OFF_MESSAGE/);
  assert.match(
    nativeContactsSource,
    /Contacts access is off\. You can enable it in iPhone Settings or import a file instead\./
  );
  assert.match(nativeContactsSource, /registerPlugin\("NativeContacts"\)/);
});
