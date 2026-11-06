import { test } from "node:test";
import assert from "node:assert/strict";
import { andList, eventName, labelFit } from "../src/eventwinner";

test("the event is read from a who-won question, and only from one", () => {
  assert.equal(eventName("Who won Super Bowl LX?"), "Super Bowl LX");
  assert.equal(eventName("Who won the 2024 US presidential election?"), "2024 US presidential election");
  assert.equal(eventName("Which team won the 2026 FIFA World Cup?"), "2026 FIFA World Cup");
  assert.equal(eventName("Resolve this market: who won the World Cup in 2022?"), "World Cup in 2022");
  assert.equal(eventName("Did the Fed cut rates in September 2025?"), null);
});

test("an item fits only when it names everything asked, closest first", () => {
  assert.equal(labelFit("Super Bowl LX", "Super Bowl LX"), 0);
  assert.equal(labelFit("Super Bowl LX", "Super Bowl LX halftime show"), 2);
  assert.equal(labelFit("Super Bowl LX", "Super Bowl LXI"), null);
  assert.equal(labelFit("World Cup in 2022", "2022 FIFA World Cup"), 1);
  assert.equal(labelFit("2024 US presidential election", "2024 United States presidential election"), 0);
  assert.equal(labelFit("2026 FIFA World Cup", "2025 FIFA Club World Cup"), null);
});

test("winners are joined as prose", () => {
  assert.equal(andList(["Spain"]), "Spain");
  assert.equal(andList(["McLaren", "Lando Norris"]), "McLaren and Lando Norris");
  assert.equal(andList(["A", "B", "C"]), "A, B and C");
});
