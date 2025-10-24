#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const featuresDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.resolve(process.cwd(), 'features');

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

const stepDefinitions = [
  {
    pattern: /^Given a fresh session with (\d+) cards available$/,
    handler: pending('Store initialization not implemented yet'),
  },
  {
    pattern: /^And no candles are lit on the cake$/,
    handler: pending('Candle state management pending'),
  },
  {
    pattern: /^When the user drags the top unplaced card onto the board$/,
    handler: pending('Drag handling pending'),
  },
  {
    pattern: /^Then that card is marked as placed$/,
    handler: pending('Store mutations pending'),
  },
  {
    pattern: /^And exactly one candle lights up$/,
    handler: pending('Candle increment pending'),
  },
  {
    pattern: /^And the HUD displays "(\d+)\/(\d+)"$/,
    handler: pending('HUD binding pending'),
  },
  {
    pattern: /^Given a second card remains in the stack$/,
    handler: pending('Deck state pending'),
  },
  {
    pattern: /^When the user attempts to drag the second card$/,
    handler: pending('Invalid drag guard pending'),
  },
  {
    pattern: /^Then the drag action is rejected$/,
    handler: pending('Drag guard pending'),
  },
  {
    pattern: /^And the candle count stays at (\d+)$/,
    handler: pending('Candle assertions pending'),
  },
  {
    pattern: /^Given one card is already placed$/,
    handler: pending('History state pending'),
  },
  {
    pattern: /^And one candle is lit$/,
    handler: pending('Candle setup pending'),
  },
  {
    pattern: /^When the user resets the session$/,
    handler: pending('Reset action pending'),
  },
  {
    pattern: /^Then all cards return to the unplaced stack$/,
    handler: pending('Reset verification pending'),
  },
  {
    pattern: /^And the candle count returns to (\d+)$/,
    handler: pending('Reset candle assertion pending'),
  },
];

function pending(reason) {
  return () => ({ status: 'pending', reason });
}

function matchStep(step) {
  for (const def of stepDefinitions) {
    const match = step.match(def.pattern);
    if (match) {
      const result = def.handler(match.slice(1));
      return typeof result === 'object' ? result : { status: 'passed' };
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

  let pendingCount = 0;
  let undefinedCount = 0;

  features.forEach((feature) => {
    console.log(`\n📄 ${feature.name}`);
    const scenarios = parseScenarios(feature.content);
    scenarios.forEach((scenario) => {
      console.log(`  ↳ ${scenario.title}`);
      scenario.steps.forEach((step) => {
        const result = matchStep(step);
        if (result.status === 'pending') pendingCount += 1;
        if (result.status === 'undefined') undefinedCount += 1;
        console.log(`     - ${step} [${result.status.toUpperCase()}]${result.reason ? ` – ${result.reason}` : ''}`);
      });
    });
  });

  console.log(`\nSummary: ${pendingCount} pending, ${undefinedCount} undefined.`);
  if (undefinedCount > 0) {
    process.exitCode = 1;
  }
}

run();
