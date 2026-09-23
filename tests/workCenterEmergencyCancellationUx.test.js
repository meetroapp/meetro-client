import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

const languageSource = readFileSync(
  new URL("../src/utils/language.js", import.meta.url),
  "utf8"
);

const policyStart = myRequestsSource.indexOf(
  "const WORK_CENTER_CANCELLABLE_EMERGENCY_STATUSES"
);
const cardStart = myRequestsSource.indexOf(
  "function EmergencyRequestCard"
);
const policyBlock = myRequestsSource.slice(
  policyStart,
  cardStart
);

const cardEnd = myRequestsSource.indexOf(
  "function MyRequests",
  cardStart
);
const cardBlock = myRequestsSource.slice(
  cardStart,
  cardEnd
);

const handlerStart = myRequestsSource.indexOf(
  "async function handleWorkCenterEmergencyCancel"
);
const handlerEnd = myRequestsSource.indexOf(
  "void recoveryTick",
  handlerStart
);
const handlerBlock = myRequestsSource.slice(
  handlerStart,
  handlerEnd
);

test(
  "Work Center Emergency cancellation policy exposes exactly the four server-authorized pre-assignment statuses",
  () => {
    assert.ok(policyStart >= 0);

    for (const status of [
      "draft",
      "ready_for_distribution",
      "active",
      "selection_pending",
    ]) {
      assert.match(
        policyBlock,
        new RegExp(`"${status}"`)
      );
    }

    for (const status of [
      "assigned",
      "professional_en_route",
      "professional_arrived",
      "in_service",
      "work_in_progress",
      "resolved",
      "completed",
      "expired",
      "unable_to_match",
      "safety_blocked",
    ]) {
      assert.doesNotMatch(
        policyBlock,
        new RegExp(`"${status}"`)
      );
    }
  }
);

test(
  "Work Center cancellation uses the existing backend command and requires canonical cancelled status",
  () => {
    assert.match(
      myRequestsSource,
      /cancelEmergencyRequest,[\s\S]*getEmergencyRequests/
    );

    assert.match(
      handlerBlock,
      /window\.confirm\(/
    );

    assert.match(
      handlerBlock,
      /cancelEmergencyRequest\([\s\S]*requestId[\s\S]*\{\s*setPage\s*\}/
    );

    assert.match(
      handlerBlock,
      /result\?\.emergencyRequest\?\.status/
    );

    assert.match(
      handlerBlock,
      /returnedStatus !== "cancelled"/
    );

    assert.match(
      handlerBlock,
      /setEmergencyReloadKey\([\s\S]*value\) => value \+ 1/
    );
  }
);

test(
  "Emergency card shows Cancel only through the bounded cancellation policy",
  () => {
    assert.match(
      cardBlock,
      /canCancelEmergencyRequestFromWorkCenter\([\s\S]*emergencyRequest/
    );

    assert.match(
      cardBlock,
      /\{canCancelFromWorkCenter && \(/
    );

    assert.match(
      cardBlock,
      /onClick=\{onCancel\}/
    );

    assert.match(
      cardBlock,
      /myRequestsEmergencyCancel/
    );

    assert.match(
      cardBlock,
      /disabled=\{cancelPending\}/
    );
  }
);

test(
  "Work Center refreshes the canonical active Emergency collection after cancellation",
  () => {
    assert.match(
      myRequestsSource,
      /getEmergencyRequests\(\s*\{\s*view: "active",\s*limit: 25/
    );

    assert.match(
      myRequestsSource,
      /\}, \[emergencyReloadKey, setPage\]\)/
    );

    assert.match(
      handlerBlock,
      /setEmergencyReloadKey/
    );

    assert.doesNotMatch(
      handlerBlock,
      /setEmergencyRequests\([\s\S]*filter/
    );
  }
);

test(
  "Service Requests is visually separated from Emergency Requests and keeps the existing Request Help route",
  () => {
    const emergencyHeading =
      myRequestsSource.indexOf(
        'id="emergency-requests-heading"'
      );
    const serviceHeading =
      myRequestsSource.indexOf(
        'id="service-requests-heading"'
      );

    assert.ok(emergencyHeading >= 0);
    assert.ok(serviceHeading > emergencyHeading);

    assert.match(
      myRequestsSource,
      /myRequestsServiceRequestsHeading/
    );

    assert.match(
      myRequestsSource,
      /setPage\("upload"\)/
    );
  }
);

test(
  "empty Service Requests presentation removes REQ and uses homeowner-facing copy",
  () => {
    const start = myRequestsSource.indexOf(
      "!isDetailView && sortedRequests.length === 0"
    );
    const end = myRequestsSource.indexOf(
      ") : (",
      start
    );
    const emptyBlock = myRequestsSource.slice(
      start,
      end
    );

    assert.ok(start >= 0);

    assert.doesNotMatch(
      emptyBlock,
      />REQ</
    );

    assert.match(
      emptyBlock,
      /myRequestsEmptyTitle/
    );

    assert.match(
      emptyBlock,
      /myRequestsEmptyText/
    );

    assert.match(
      emptyBlock,
      /myRequestsRequestHelp/
    );

    assert.match(
      emptyBlock,
      /setPage\("upload"\)/
    );
  }
);

test(
  "Service Request and Emergency cancellation copy exists in all four supported languages",
  () => {
    for (const key of [
      "myRequestsServiceRequestsHeading",
      "myRequestsEmergencyCancel",
      "myRequestsEmergencyCancelConfirm",
      "myRequestsEmergencyCancelling",
      "myRequestsEmergencyCancelFailed",
    ]) {
      const matches =
        languageSource.match(
          new RegExp(`${key}:`, "g")
        ) || [];

      assert.equal(
        matches.length,
        4,
        `${key} must exist once in each supported language`
      );
    }

    assert.match(
      languageSource,
      /myRequestsEmptyTitle: "No active service requests"/
    );

    assert.match(
      languageSource,
      /myRequestsRequestHelp: "Start Service Request"/
    );
  }
);
