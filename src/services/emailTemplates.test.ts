import assert from "node:assert/strict";
import { test } from "vitest";

import {
  getMatchNotificationTemplate,
  getMatchStatusUpdateTemplate,
} from "./emailTemplates";

test("renders the current year and escapes notification data", () => {
  const html = getMatchNotificationTemplate(
    {
      userName: "<Student>",
      matchType: "Single",
      subjects: ["Algorithms & Data"],
      fromClass: "1DA",
      toClass: "1DB",
      otherParticipants: ["Other <user>"],
      matchId: "match-1",
      dashboardUrl: "https://unclassed.example.com/",
    },
    2030
  );

  assert.match(html, /© 2030 Unclassed/);
  assert.match(html, /&lt;Student&gt;/);
  assert.match(html, /Algorithms &amp; Data/);
  assert.doesNotMatch(html, /<Student>/);
});

test("escapes status-update details", () => {
  const html = getMatchStatusUpdateTemplate({
    userName: "Student",
    status: "ACCEPTED",
    details: '<img src=x onerror="alert(1)">',
    matchesUrl: "https://unclassed.example.com/matches",
  });

  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /<img/);
});
