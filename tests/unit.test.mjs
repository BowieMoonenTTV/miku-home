import { test } from "node:test";
import assert from "node:assert/strict";
import { localReply } from "../app/js/replies.js";
test("say hi greets Bowie", () => assert.equal(localReply("say hi"), "Hi Bowie, it's Miku."));
test("empty input asks to type", () => assert.match(localReply(""), /type instead/));
test("home controls explain the add-on", () => assert.match(localReply("turn on the lights"), /Home Assistant/));
test("time reply", () => assert.match(localReply("what time is it", { now: new Date(2026, 9, 25, 20, 5) }), /^It's /));
