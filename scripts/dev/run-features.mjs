#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../state/store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const featuresDir = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'features');

function readFeatureFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`⚠️  Features directory not found: ${dir}`);
    process.exitCode = 1;
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.feature'))
    .map((file) => ({
      name: file,
      content: fs.readFileSync(path.join(dir, file), 'utf8'),
    }));
}

function parseScenarios(content) {
  const lines = content.split(/\r?\n/);
  const scenarios = [];
  let current = null;
  let background = [];
  let inBackground = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('Background')) {
      inBackground = true;
      background = [];
      continue;
    }
    if (line.startsWith('Scenario')) {
      if (current) scenarios.push(current);
      current = { title: line, steps: [...background] };
      inBackground = false;
      continue;
    }
    if (/^(Given|When|Then|And)/.test(line)) {
      if (inBackground) {
        background.push(line);
      } else if (current) {
        current.steps.push(line);
      } else {
        console.warn(`Skipping orphan step: ${line}`);
      }
    }
  }
  if (current) scenarios.push(current);
  return scenarios;
}

function createWorld() {
  return {
    store: createStore(),
    lastDragResult: null,
    lastPlacedId: null,
  };
}

const stepDefinitions = [
  {
    pattern: /^Given a fresh session with (\d+) cards available$/,
    handler: (ctx, [total]) => {
      const count = Number(total);
      if (!Number.isFinite(count) || count <= 0) {
        return fail(`Invalid card count: ${total}`);
      }
      ctx.world.store.initializeDeck(count);
      ctx.world.lastDragResult = null;
      ctx.world.lastPlacedId = null;
      return pass();
    },
  },
  {
    pattern: /^And no candles are lit on the cake$/,
    handler: (ctx) => {
      const { candlesLit } = ctx.world.store.getState();
      return candlesLit === 0 ? pass() : fail(`Expected 0 candles, found ${candlesLit}`);
    },
  },
  {
    pattern: /^When the user drags the top unplaced card onto the board$/,
    handler: (ctx) => {
      const topCard = ctx.world.store.getTopUnplacedCard();
      if (!topCard) {
        return fail('No unplaced cards remain');
      }
      const dragResult = ctx.world.store.dragCard(topCard.id);
      if (!dragResult.allowed) {
        return fail(`Drag was rejected: ${dragResult.reason}`);
      }
      const placeResult = ctx.world.store.placeCard(topCard.id);
      if (!placeResult.placed) {
        return fail(`Placement failed: ${placeResult.reason || 'unknown reason'}`);
      }
      ctx.world.lastPlacedId = topCard.id;
      return pass();
    },
  },
  {
    pattern: /^Then that card is marked as placed$/,
    handler: (ctx) => {
      const { lastPlacedId } = ctx.world;
      if (lastPlacedId === null) {
        return fail('No card placement recorded');
      }
      const state = ctx.world.store.getState();
      const card = state.cards.find((entry) => entry.id === lastPlacedId);
      if (!card) {
        return fail(`Card ${lastPlacedId} missing from state`);
      }
      return card.status === 'placed' ? pass() : fail(`Card ${lastPlacedId} status is ${card.status}`);
    },
  },
  {
    pattern: /^And exactly one candle lights up$/,
    handler: (ctx) => {
      const { candlesLit } = ctx.world.store.getState();
      return candlesLit === 1 ? pass() : fail(`Expected 1 candle lit, found ${candlesLit}`);
    },
  },
  {
    pattern: /^And the HUD displays "(\d+)\/(\d+)"$/,
    handler: (ctx, [lit, total]) => {
      const expected = `${lit}/${total}`;
      const actual = ctx.world.store.getProgressText();
      return actual === expected ? pass() : fail(`Expected HUD ${expected}, found ${actual}`);
    },
  },
  {
    pattern: /^Given a second card remains in the stack$/,
    handler: (ctx) => {
      const unplaced = ctx.world.store.getState().cards.filter((card) => card.status === 'unplaced');
      if (unplaced.length < 2) {
        return fail('Less than two unplaced cards remain');
      }
      ctx.world.firstCardId = unplaced[0].id;
      ctx.world.secondCardId = unplaced[1].id;
      return pass();
    },
  },
  {
    pattern: /^When the user attempts to drag the second card$/,
    handler: (ctx) => {
      const { secondCardId } = ctx.world;
      if (secondCardId === undefined) {
        return fail('Second card context missing');
      }
      const dragResult = ctx.world.store.dragCard(secondCardId);
      ctx.world.lastDragResult = dragResult;
      return dragResult.allowed ? fail('Second card drag should be rejected') : pass();
    },
  },
  {
    pattern: /^Then the drag action is rejected$/,
    handler: (ctx) => {
      const result = ctx.world.lastDragResult;
      if (!result) {
        return fail('No drag attempt recorded');
      }
      return result.allowed ? fail('Drag was allowed but expected rejection') : pass();
    },
  },
  {
    pattern: /^And the candle count stays at (\d+)$/,
    handler: (ctx, [expected]) => {
      const candles = ctx.world.store.getState().candlesLit;
      const expectedNumber = Number(expected);
      return candles === expectedNumber ? pass() : fail(`Expected ${expectedNumber} candles, found ${candles}`);
    },
  },
  {
    pattern: /^Given one card is already placed$/,
    handler: (ctx) => {
      const topCard = ctx.world.store.getTopUnplacedCard();
      if (!topCard) {
        return fail('No card available to place');
      }
      const dragResult = ctx.world.store.dragCard(topCard.id);
      if (!dragResult.allowed) {
        return fail(`Drag rejected while preparing setup: ${dragResult.reason}`);
      }
      const placeResult = ctx.world.store.placeCard(topCard.id);
      if (!placeResult.placed) {
        return fail(`Placement failed during setup: ${placeResult.reason || 'unknown reason'}`);
      }
      ctx.world.lastPlacedId = topCard.id;
      return pass();
    },
  },
  {
    pattern: /^And one candle is lit$/,
    handler: (ctx) => {
      const { candlesLit } = ctx.world.store.getState();
      return candlesLit === 1 ? pass() : fail(`Expected 1 candle lit, found ${candlesLit}`);
    },
  },
  {
    pattern: /^When the user resets the session$/,
    handler: (ctx) => {
      ctx.world.store.resetSession();
      ctx.world.lastPlacedId = null;
      ctx.world.lastDragResult = null;
      return pass();
    },
  },
  {
    pattern: /^Then all cards return to the unplaced stack$/,
    handler: (ctx) => {
      const state = ctx.world.store.getState();
      const misplaced = state.cards.filter((card) => card.status !== 'unplaced');
      return misplaced.length === 0 ? pass() : fail(`Found ${misplaced.length} cards not reset`);
    },
  },
  {
    pattern: /^And the candle count returns to (\d+)$/,
    handler: (ctx, [expected]) => {
      const candles = ctx.world.store.getState().candlesLit;
      const expectedNumber = Number(expected);
      return candles === expectedNumber ? pass() : fail(`Expected ${expectedNumber} candles, found ${candles}`);
    },
  },
];

function pass() {
  return { status: 'passed' };
}

function fail(reason) {
  return { status: 'failed', reason };
}

function matchStep(step, context) {
  for (const def of stepDefinitions) {
    const match = step.match(def.pattern);
    if (match) {
      try {
        const result = def.handler(context, match.slice(1));
        if (!result) return pass();
        return result;
      } catch (error) {
        return fail(error.message);
      }
    }
  }
  return { status: 'undefined', reason: 'No step definition found' };
}

function run() {
  const features = readFeatureFiles(featuresDir);
  if (!features.length) {
    console.warn('No feature files found.');
    return;
  }

  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let undefinedCount = 0;

  features.forEach((feature) => {
    console.log(`\n📄 ${feature.name}`);
    const scenarios = parseScenarios(feature.content);
    scenarios.forEach((scenario) => {
      console.log(`  ↳ ${scenario.title}`);
      const world = createWorld();
      let scenarioFailed = false;
      scenario.steps.forEach((step) => {
        if (scenarioFailed) {
          console.log(`     - ${step} [SKIPPED]`);
          return;
        }
        const result = matchStep(step, { world });
        switch (result.status) {
          case 'passed':
            passedCount += 1;
            console.log(`     - ${step} [PASSED]`);
            break;
          case 'failed':
            failedCount += 1;
            scenarioFailed = true;
            console.log(`     - ${step} [FAILED] – ${result.reason}`);
            break;
          case 'pending':
            pendingCount += 1;
            console.log(`     - ${step} [PENDING]${result.reason ? ` – ${result.reason}` : ''}`);
            break;
          default:
            undefinedCount += 1;
            console.log(`     - ${step} [UNDEFINED]${result.reason ? ` – ${result.reason}` : ''}`);
            break;
        }
      });
    });
  });

  console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed, ${pendingCount} pending, ${undefinedCount} undefined.`);
  if (failedCount > 0 || undefinedCount > 0) {
    process.exitCode = 1;
  }
}

run();
