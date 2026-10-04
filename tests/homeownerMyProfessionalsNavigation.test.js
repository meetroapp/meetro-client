import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(
  "src/App.jsx",
  "utf8"
);

const home = readFileSync(
  "src/pages/Home.jsx",
  "utf8"
);

const profile = readFileSync(
  "src/pages/Profile.jsx",
  "utf8"
);

const navigation = readFileSync(
  "src/components/BottomNav.jsx",
  "utf8"
);

const discover = readFileSync(
  "src/pages/Discover.jsx",
  "utf8"
);

test("My Professionals is one canonical homeowner route", () => {
  assert.match(
    app,
    /lazy\(\(\) => import\("\.\/pages\/MyProfessionals"\)\)/
  );

  assert.match(
    app,
    /if \(page === "myProfessionals"\)/
  );
});

test("Profile and Home dashboard open the same My Professionals workspace", () => {
  assert.match(
    profile,
    /setPage\("myProfessionals"\)/
  );

  assert.match(
    home,
    /setPage\("myProfessionals"\)/
  );

  assert.match(
    home,
    /className="home-my-professionals-entry"/
  );

  assert.doesNotMatch(
    home,
    /className="home-community-entry"/
  );
});

test("desktop and iPad sidebar expose My Professionals without changing mobile bottom navigation", () => {
  const mobileStart =
    navigation.indexOf(
      "const personalMobileNavItems"
    );

  const mobileEnd =
    navigation.indexOf(
      "const businessMobileNavItems",
      mobileStart
    );

  const desktopStart =
    navigation.indexOf(
      "const personalDesktopNavItems"
    );

  const desktopEnd =
    navigation.indexOf(
      "const businessDesktopNavItems",
      desktopStart
    );

  assert.ok(mobileStart >= 0);
  assert.ok(mobileEnd > mobileStart);
  assert.ok(desktopStart >= 0);
  assert.ok(desktopEnd > desktopStart);

  const mobileBlock =
    navigation.slice(
      mobileStart,
      mobileEnd
    );

  const desktopBlock =
    navigation.slice(
      desktopStart,
      desktopEnd
    );

  assert.doesNotMatch(
    mobileBlock,
    /page:\s*"myProfessionals"/
  );

  assert.match(
    desktopBlock,
    /page:\s*"myProfessionals"/
  );
});

test("Find Professionals opens Community without overriding Community landing authority", () => {
  assert.match(
    profile,
    /setPage\("discover"\)/
  );

  assert.match(
    discover,
    /useState\("communityHub"\)/
  );

  assert.doesNotMatch(
    discover,
    /localStorage\.getItem\("activeDiscoverMode"\)/
  );
});
