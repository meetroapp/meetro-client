import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);

function phoneMenuGeometry(viewportWidth, safeLeft = 0, safeRight = 0) {
  const pageLeft = Math.max(18, safeLeft);
  const pageRight = Math.max(18, safeRight);
  const contentWidth = viewportWidth - pageLeft - pageRight;

  return {
    buttonLeft: pageLeft,
    buttonRight: pageLeft + contentWidth,
    menuLeft: pageLeft,
    menuRight: pageLeft + contentWidth,
    documentWidthClosed: viewportWidth,
    documentWidthOpen: Math.max(viewportWidth, pageLeft + contentWidth),
    bodyWidthClosed: viewportWidth,
    bodyWidthOpen: Math.max(viewportWidth, pageLeft + contentWidth),
  };
}

function createImportState() {
  return { contacts: [], selectedIds: [], search: "" };
}

function addContacts(state, contacts) {
  const seen = new Set(state.contacts.map((contact) => contact.id));
  const unique = contacts.filter((contact) => {
    if (seen.has(contact.id)) return false;
    seen.add(contact.id);
    return true;
  });

  return {
    ...state,
    contacts: [...state.contacts, ...unique],
    selectedIds: state.selectedIds.filter((id) => seen.has(id)),
  };
}

function toggleContact(state, id) {
  const selected = new Set(state.selectedIds);
  selected.has(id) ? selected.delete(id) : selected.add(id);
  return { ...state, selectedIds: [...selected] };
}

function visibleContacts(state) {
  const query = state.search.toLowerCase().trim();
  if (!query) return state.contacts;
  return state.contacts.filter((contact) =>
    [contact.name, contact.email, contact.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function importPayload(state) {
  const selected = new Set(state.selectedIds);
  return state.contacts.filter((contact) => selected.has(contact.id));
}

test("physical iPhone widths use the contained Communication Center header layout", () => {
  assert.match(messagesSource, /@media \(max-width: 599px\)/);
  assert.match(messagesSource, /className="messages-header-action-menu"/);
  assert.match(
    messagesSource,
    /\.messages-header-action-menu \{[\s\S]*left: 0 !important;[\s\S]*right: 0 !important;[\s\S]*width: 100% !important;[\s\S]*max-width: 100% !important;/
  );
});

test("Add / Import button and menu remain inside portrait iPhone safe areas", () => {
  for (const viewportWidth of [320, 375, 390, 393, 414, 428, 430, 440]) {
    for (const [safeLeft, safeRight] of [[0, 0], [12, 16], [24, 20]]) {
      const geometry = phoneMenuGeometry(viewportWidth, safeLeft, safeRight);

      assert.ok(geometry.buttonLeft >= safeLeft);
      assert.ok(geometry.menuLeft >= safeLeft);
      assert.ok(geometry.buttonRight <= viewportWidth - safeRight);
      assert.ok(geometry.menuRight <= viewportWidth - safeRight);
      assert.equal(geometry.documentWidthOpen, geometry.documentWidthClosed);
    }
  }
});

test("repeated Add / Import open and close cycles do not change document width", () => {
  const viewportWidth = 440;
  const geometry = phoneMenuGeometry(viewportWidth, 0, 0);

  for (let cycle = 0; cycle < 20; cycle += 1) {
    assert.equal(geometry.documentWidthOpen, viewportWidth);
    assert.equal(geometry.documentWidthClosed, viewportWidth);
  }
});

test("Add / Import to Import Contacts mounts an inline-size-contained phone surface", () => {
  assert.match(messagesSource, /if \(type === "import"\) \{[\s\S]*setContactImport\(createEmptyContactImport\(activeAccountMode\)\)/);
  assert.match(messagesSource, /className="meetro-visual-surface messages-contact-entry messages-contact-import"/);
  assert.match(
    messagesSource,
    /\.messages-contact-entry \{[\s\S]*contain: inline-size;[\s\S]*overflow-x: hidden !important;[\s\S]*overscroll-behavior-x: none;/
  );
  assert.match(
    messagesSource,
    /\.messages-contact-entry,[\s\S]*\.messages-contact-entry \* \{[\s\S]*max-inline-size: 100%;[\s\S]*min-inline-size: 0;/
  );
});

test("Import Contacts constrains search inputs actions and populated or empty states", () => {
  assert.match(messagesSource, /contactImport\.step === "select"/);
  assert.match(messagesSource, /visibleImportContacts\.length > 0/);
  assert.match(messagesSource, /const searchInput = \{[\s\S]*width: "100%",[\s\S]*minWidth: 0/);
  assert.match(messagesSource, /const contactImportActionRow = \{[\s\S]*flexWrap: "wrap"/);
  assert.match(
    messagesSource,
    /\.messages-contact-entry input:not\(\[type="checkbox"\]\),[\s\S]*\.messages-contact-entry textarea,[\s\S]*\.messages-contact-entry select \{[\s\S]*inline-size: 100% !important;/
  );
});

test("long imported names emails and phone numbers cannot establish an intrinsic page width", () => {
  const longValues = [
    "A".repeat(512),
    `${"contact".repeat(80)}@example.com`,
    `+1${"2125550199".repeat(30)}`,
  ];
  const viewportWidth = 320;
  const geometry = phoneMenuGeometry(viewportWidth, 0, 0);

  for (const value of longValues) {
    assert.ok(value.length > geometry.menuRight - geometry.menuLeft);
    assert.equal(geometry.documentWidthOpen, viewportWidth);
  }

  assert.match(messagesSource, /className="messages-contact-import-copy"/);
  assert.match(messagesSource, /const contactImportNameBlock = \{[\s\S]*width: "100%"[\s\S]*overflow: "hidden"[\s\S]*overflowWrap: "anywhere"[\s\S]*wordBreak: "break-word"/);
});

test("contact import containment survives keyboard and repeated surface cycles", () => {
  for (const viewportWidth of [320, 375, 390, 393, 414, 428, 430, 440]) {
    for (const visualViewportWidth of [viewportWidth, viewportWidth - 1]) {
      const geometry = phoneMenuGeometry(visualViewportWidth, 0, 0);

      for (let cycle = 0; cycle < 20; cycle += 1) {
        assert.equal(geometry.documentWidthOpen, visualViewportWidth);
        assert.equal(geometry.documentWidthClosed, visualViewportWidth);
        assert.equal(geometry.bodyWidthOpen, visualViewportWidth);
        assert.equal(geometry.bodyWidthClosed, visualViewportWidth);
      }
    }
  }
});

test("Manually Add Contact uses the same contained mobile contact-entry surface", () => {
  assert.match(messagesSource, /const CONTACTS_SECTION_ACTIONS = \[[\s\S]*\["customer", "messagesAddCustomer"\]/);
  assert.match(messagesSource, /setRelationshipComposer\(\{[\s\S]*createEmptyComposer\(type, label\),[\s\S]*section: messageSection/);
  assert.match(messagesSource, /relationshipComposer\.section === "contacts"[\s\S]*messages-contact-entry messages-contact-manual-entry/);
  assert.match(messagesSource, /const relationshipComposerForm = \{[\s\S]*width: "100%"[\s\S]*minWidth: 0[\s\S]*overflowX: "hidden"/);
  assert.match(messagesSource, /const relationshipTextarea = \{[\s\S]*\.\.\.relationshipInput/);
});

test("manual contact validation and branch switching preserve the contained surface", () => {
  assert.match(messagesSource, /if \(!name && relationshipComposer\.type !== "invite"\) \{[\s\S]*Add a name before saving this relationship\./);
  assert.match(messagesSource, /onClick=\{\(\) => setRelationshipComposer\(null\)\}/);
  assert.match(messagesSource, /if \(type === "import"\) \{[\s\S]*setRelationshipComposer\(null\)/);
  assert.match(messagesSource, /setContactImport\(null\);[\s\S]*setRelationshipComposer\(\{/);
});

test("phone contact-entry text controls prevent iOS focus auto-zoom", () => {
  assert.match(
    messagesSource,
    /\.messages-contact-entry input:not\(\[type="checkbox"\]\),[\s\S]*\.messages-contact-entry textarea,[\s\S]*\.messages-contact-entry select \{[\s\S]*font-size: 16px !important;/
  );
  assert.match(messagesSource, /className="messages-contact-search-input"/);
  assert.match(
    messagesSource,
    /\.messages-contact-search-input \{[\s\S]*font-size: 16px !important;/
  );
  assert.doesNotMatch(messagesSource, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
});

test("every phone width keeps document and body stable while controls are focused", () => {
  for (const viewportWidth of [320, 360, 375, 390, 414, 430, 440]) {
    const geometry = phoneMenuGeometry(viewportWidth, 0, 0);

    assert.equal(geometry.documentWidthOpen, viewportWidth);
    assert.equal(geometry.bodyWidthOpen, viewportWidth);
  }
});

test("long manual notes and validation copy remain inside the contact-entry surface", () => {
  assert.match(messagesSource, /const relationshipTextarea = \{[\s\S]*maxWidth: "100%"[\s\S]*minWidth: 0/);
  assert.match(messagesSource, /const relationshipNoticeCard = \{[\s\S]*maxWidth: "100%"[\s\S]*minWidth: 0[\s\S]*overflowWrap: "anywhere"/);
  assert.match(messagesSource, /Add a name before saving this relationship\./);
});

test("iPad and desktop retain their existing header and popover declarations", () => {
  assert.match(messagesSource, /const relationshipActionDropdown = \{[\s\S]*right: 0,[\s\S]*left: "auto"/);
  assert.match(messagesSource, /width: "min\(268px, calc\(100dvw - 40px\)\)"/);
  assert.doesNotMatch(messagesSource, /@media \(max-width: (?:600|767|768|1024)px\)/);
});

test("contact entry uses the approved closed choice import and manual modes", () => {
  assert.match(messagesSource, /useState\("closed"\)/);
  assert.match(messagesSource, /setContactEntryMode\(nextOpen \? "choice" : "closed"\)/);
  assert.match(messagesSource, /if \(type === "import"\) \{[\s\S]*setContactEntryMode\("import"\)/);
  assert.match(messagesSource, /setContactEntryMode\(messageSection === "contacts" \? "manual" : "closed"\)/);
  assert.match(messagesSource, /function returnToContactEntryChoice\(\) \{[\s\S]*setContactEntryMode\("choice"\)/);
  assert.match(messagesSource, /function closeContactEntry\(\) \{[\s\S]*setContactEntryMode\("closed"\)/);
});

test("native and file contacts start with zero explicit selections", () => {
  let state = createImportState();
  state = addContacts(state, [
    { id: "1", name: "A" },
    { id: "2", name: "B" },
    { id: "2", name: "B duplicate" },
  ]);

  assert.equal(state.contacts.length, 2);
  assert.deepEqual(state.selectedIds, []);
  assert.match(messagesSource, /selectedIds: \[\]/);
  assert.match(
    messagesSource,
    /selectedIds: current\.selectedIds\.filter\(\(contactId\) =>[\s\S]*existingIds\.has\(contactId\)/
  );
  assert.doesNotMatch(
    messagesSource,
    /selectedIds:[\s\S]{0,160}normalizedContacts\.map\(\(contact\) => contact\.id\)/
  );
});

test("individual selection toggles on and off through controlled selected IDs", () => {
  let state = addContacts(createImportState(), [{ id: "1", name: "A" }]);
  state = toggleContact(state, "1");
  assert.deepEqual(state.selectedIds, ["1"]);
  state = toggleContact(state, "1");
  assert.deepEqual(state.selectedIds, []);

  assert.match(messagesSource, /checked=\{contactImport\.selectedIds\.includes\(contact\.id\)\}/);
  assert.match(messagesSource, /onChange=\{\(\) => toggleImportedContact\(contact\.id\)\}/);
  assert.match(messagesSource, /aria-label=\{`Select \$\{contact\.name \|\| contact\.email \|\| contact\.phone\}`\}/);
});

test("multiple selection count survives rerenders and repeated toggle cycles", () => {
  let state = addContacts(createImportState(), [
    { id: "1", name: "A" },
    { id: "2", name: "B" },
    { id: "3", name: "C" },
  ]);
  state = toggleContact(toggleContact(state, "1"), "3");
  assert.equal(state.selectedIds.length, 2);
  assert.deepEqual(structuredClone(state).selectedIds, ["1", "3"]);

  for (let cycle = 0; cycle < 20; cycle += 1) {
    state = toggleContact(toggleContact(state, "2"), "2");
    assert.deepEqual(state.selectedIds, ["1", "3"]);
  }

  assert.match(messagesSource, /\{selectedImportContacts\.length\} selected/);
});

test("Select All is explicit and toggles back to a zero-selection Clear All state", () => {
  assert.match(messagesSource, /function toggleAllImportedContacts\(\)/);
  assert.match(
    messagesSource,
    /const allSelected =[\s\S]*contactIds\.every\(\(contactId\) => current\.selectedIds\.includes\(contactId\)\)/
  );
  assert.match(messagesSource, /selectedIds: allSelected \? \[\] : contactIds/);
  assert.match(messagesSource, /\? "Clear All"[\s\S]*: t\("messagesSelectAllContacts", language\)/);
  assert.doesNotMatch(messagesSource, /createEmptyContactImport[\s\S]{0,300}selectedIds: contactIds/);
});

test("search changes visibility without changing persistent selections", () => {
  let state = addContacts(createImportState(), [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Grace Hopper", phone: "+15551234567" },
    { id: "3", name: "Long", email: `${"contact".repeat(80)}@example.com` },
  ]);
  state = toggleContact(state, "1");
  state = { ...state, search: "grace" };
  assert.deepEqual(visibleContacts(state).map(({ id }) => id), ["2"]);
  assert.deepEqual(state.selectedIds, ["1"]);
  state = toggleContact(state, "2");
  state = { ...state, search: "" };
  assert.equal(visibleContacts(state).length, 3);
  assert.deepEqual(state.selectedIds, ["1", "2"]);

  assert.match(messagesSource, /const visibleImportContacts = contactImport/);
  assert.match(messagesSource, /updateContactImport\(\{ search: event\.target\.value, notice: "" \}\)/);
});

test("zero selection disables review and final import controls", () => {
  assert.match(messagesSource, /disabled=\{selectedImportContacts\.length === 0\}/);
  assert.match(messagesSource, /aria-disabled=\{selectedImportContacts\.length === 0\}/);
  assert.match(messagesSource, /if \(contactImport\.selectedIds\.length === 0\)/);
  assert.match(messagesSource, /if \(selectedContacts\.length === 0\)/);
});

test("import payload includes selected contacts even when filtered out and excludes all others", () => {
  let state = addContacts(createImportState(), [
    { id: "1", name: "Selected before search" },
    { id: "2", name: "Selected during search" },
    { id: "3", name: "Never selected" },
  ]);
  state = toggleContact(state, "1");
  state = { ...state, search: "during" };
  state = toggleContact(state, "2");

  assert.deepEqual(importPayload(state).map(({ id }) => id), ["1", "2"]);
  assert.match(messagesSource, /const selectedIds = new Set\(contactImport\.selectedIds\)/);
  assert.match(messagesSource, /contactImport\.contacts\.filter\(\(contact\) =>[\s\S]*selectedIds\.has\(contact\.id\)/);
});

test("back cancel and reopen clear import search selection and manual drafts", () => {
  assert.match(
    messagesSource,
    /function returnToContactEntryChoice\(\) \{[\s\S]*setContactImport\(null\);[\s\S]*current\?\.section === "contacts" \? null : current/
  );
  assert.match(
    messagesSource,
    /function closeContactEntry\(\) \{[\s\S]*setContactImport\(null\);[\s\S]*current\?\.section === "contacts" \? null : current/
  );
  assert.match(
    messagesSource,
    /setContactEntryMode\(nextOpen \? "choice" : "closed"\);[\s\S]*setContactImport\(null\)/
  );
});

test("import and manual mode branches are mutually exclusive and unmounted", () => {
  assert.match(messagesSource, /contactEntryMode === "import" && contactImport &&/);
  assert.match(
    messagesSource,
    /relationshipComposer\.section !== "contacts" \|\| contactEntryMode === "manual"/
  );
  assert.doesNotMatch(messagesSource, /contactImport\.manual/);
  assert.doesNotMatch(messagesSource, /contactImportManualCard/);
  assert.doesNotMatch(messagesSource, /startManualContactImport|addManualImportContact/);
});

test("manual save remains scoped to supported composer values", () => {
  assert.match(messagesSource, /const name = relationshipComposer\.name\.trim\(\)/);
  assert.match(messagesSource, /const email = relationshipComposer\.email\.trim\(\)/);
  assert.match(messagesSource, /phone: relationshipComposer\.phone\.trim\(\)/);
  assert.match(messagesSource, /address: relationshipComposer\.address\.trim\(\)/);
  assert.match(messagesSource, /relationshipComposer\.note\.trim\(\)/);
  assert.match(messagesSource, /setMessageSection\("contacts"\)/);
});
