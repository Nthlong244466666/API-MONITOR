const operators = {
  EQ: (a,b) => JSON.stringify(a) === JSON.stringify(b),
  LT: (a,b) => typeof a === 'number' && typeof b === 'number' && a < b,
  LTE: (a,b) => typeof a === 'number' && typeof b === 'number' && a <= b,
};

function getAtPath(data, path) {
  if (typeof path !== 'string' || !/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*){0,15}$/.test(path)) {
    return { exists: false, value: undefined };
  }
  let value = data;
  for (const part of path.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) {
      return { exists: false, value: undefined };
    }
    value = value[part];
  }
  return { exists: true, value };
}

export function evaluateAssertions(assertions, result) {
  const enabled = assertions.filter((a) => a.isEnabled);
  let json;
  let jsonValid = false;
  if (result.responseBody != null) {
    try { json = JSON.parse(result.responseBody); jsonValid = true; } catch { /* no JSON */ }
  }
  const items = enabled.map((a) => {
    let actual = null;
    let passed = false;
    let reason = null;
    const expected = a.expectedValue ?? null;
    if (a.type === 'STATUS') {
      actual = result.statusCode;
      passed = a.operator === 'EQ' && Number.isInteger(expected) && actual === expected;
    } else if (a.type === 'LATENCY') {
      actual = result.responseTimeMs;
      passed = ['LT', 'LTE'].includes(a.operator) && operators[a.operator](actual, expected);
    } else if (a.type === 'JSON') {
      if (!jsonValid) reason = 'INVALID_RESPONSE_JSON';
      else {
        const found = getAtPath(json, a.target);
        actual = found.exists ? found.value : null;
        if (a.operator === 'EXISTS') passed = found.exists;
        else if (a.operator === 'EQ') passed = found.exists && operators.EQ(found.value, expected);
        else reason = 'UNSUPPORTED_ASSERTION';
      }
    } else reason = 'UNSUPPORTED_ASSERTION';
    // Never store actual values from JSON paths: they may be secrets.
    return {
      id: a.id, type: a.type, operator: a.operator, target: a.target,
      passed, actual: a.type === 'JSON' ? (passed ? '[MATCHED]' : '[REDACTED]') : actual,
      expected: a.type === 'JSON' ? '[REDACTED]' : expected, reason,
    };
  });
  const hasStatusAssertion = enabled.some((a) => a.type === 'STATUS');
  const httpPass = hasStatusAssertion
    ? true // Explicit STATUS assertion may expect e.g. 404.
    : result.statusCode >= 200 && result.statusCode < 300;
  return { items, isSuccess: httpPass && items.every((a) => a.passed) };
}
