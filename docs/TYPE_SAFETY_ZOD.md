# Type Safety with Zod: Runtime Validation Guide

> Learn why TypeScript types aren't enough and how Zod provides runtime validation for bulletproof applications.

---

## Table of Contents

1. [The Problem: Runtime vs Compile-Time](#the-problem-runtime-vs-compile-time)
2. [TypeScript's Hidden Weakness](#typescripts-hidden-weakness)
3. [Enter Zod: Runtime Validation](#enter-zod-runtime-validation)
4. [Practical Implementation](#practical-implementation)
5. [JavaScript/TypeScript Fundamentals](#javascripttypescript-fundamentals)
6. [Common Patterns](#common-patterns)
7. [Experiments to Try](#experiments-to-try)
8. [Best Practices](#best-practices)
9. [Further Learning](#further-learning)

---

## The Problem: Runtime vs Compile-Time

### What is Compile-Time?

**Compile-time** is when TypeScript checks your code BEFORE it runs:

```typescript
// TypeScript catches this at COMPILE-TIME (when you save the file)
const name: string = 42;  // ❌ Error: Type 'number' is not assignable to type 'string'
```

Your editor shows the red squiggly line immediately. Great!

### What is Runtime?

**Runtime** is when your code actually executes in the browser or Node.js:

```typescript
// This happens at RUNTIME (when the code runs)
const response = await fetch('/api/data');
const data = await response.json();  // What's in here? 🤷
```

### The Gap

TypeScript checks your code at compile-time, but **external data** comes at runtime:

- API responses
- User input
- File contents
- Database queries
- WebSocket messages

TypeScript has NO WAY to verify this data matches your types!

---

## TypeScript's Hidden Weakness

### The Dangerous Pattern

```typescript
// You define a beautiful interface
interface User {
  name: string;
  age: number;
  email: string;
}

// You fetch data from an API
const response = await fetch('/api/user/123');
const user: User = await response.json();  // ⚠️ DANGER!

// TypeScript says "user.age is a number"
// But what if the API actually returned { name: "Alice", age: "twenty five" }?
console.log(user.age + 1);  // "twenty five1" (string concatenation!)
```

### Why TypeScript Can't Help

1. TypeScript types are **erased** after compilation
2. The JavaScript that runs has **no type information**
3. `response.json()` returns `any` (or `unknown`)
4. The type assertion `: User` is a **promise**, not a guarantee

### Real-World Consequences

```typescript
// Your API contract says:
interface SignalResult {
  value: number;  // -1 to 1
  confidence: number;
}

// But one day, the backend developer changes it to:
// { val: 0.5, conf: 0.8 }

// Your frontend code:
const signal: SignalResult = await fetch('/api/signals').then(r => r.json());

// TypeScript: "Looks fine to me! 👍"
// Runtime: signal.value is undefined
// Your trading bot: Makes terrible decisions based on undefined
```

---

## Enter Zod: Runtime Validation

### What is Zod?

Zod is a TypeScript-first schema declaration and validation library. It validates data at **runtime** and infers TypeScript types from schemas.

```typescript
import { z } from 'zod';

// Define a schema (like an interface, but ACTIVE)
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Zod can INFER the TypeScript type!
type User = z.infer<typeof UserSchema>;
// Equivalent to: { name: string; age: number; email: string }

// Now validate at runtime
const data = await fetch('/api/user').then(r => r.json());
const user = UserSchema.parse(data);  // Throws if invalid!
```

### Parse vs SafeParse

```typescript
// .parse() - Throws an error if validation fails
try {
  const user = UserSchema.parse(data);
  // Use user safely
} catch (error) {
  console.error('Validation failed:', error);
}

// .safeParse() - Returns a result object (no throwing)
const result = UserSchema.safeParse(data);
if (result.success) {
  const user = result.data;  // Fully typed!
} else {
  console.error('Validation failed:', result.error.issues);
}
```

---

## Practical Implementation

### Project Structure

```
app/lib/schemas/
├── fred.ts      # FRED API response schemas
├── signals.ts   # Trading signals schemas
└── index.ts     # Central exports
```

### FRED API Schema Example

```typescript
// app/lib/schemas/fred.ts
import { z } from 'zod';

// Schema for a single observation
export const FredObservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.string(),
});

// Schema for API response
export const FredApiResponseSchema = z.object({
  series: z.string(),
  observations: z.array(FredObservationSchema),
  count: z.number(),
});

// Infer types from schemas (Single Source of Truth!)
export type FredObservation = z.infer<typeof FredObservationSchema>;
export type FredApiResponse = z.infer<typeof FredApiResponseSchema>;
```

### Using in API Routes

```typescript
// app/api/fred/route.ts
import { FredApiResponseSchema } from '@/app/lib/schemas/fred';

export async function GET(request: NextRequest) {
  // ... fetch data from FRED ...

  // Validate BEFORE sending to client
  const responseData = {
    series: seriesId,
    observations: observations,
    count: observations.length,
  };

  // This throws if data doesn't match schema
  const validated = FredApiResponseSchema.parse(responseData);

  return NextResponse.json(validated);
}
```

---

## JavaScript/TypeScript Fundamentals

### Why JavaScript Needs Runtime Checks

JavaScript is **dynamically typed** - variables can hold any type:

```javascript
let value = 42;      // number
value = "hello";     // now it's a string
value = { a: 1 };    // now it's an object
```

TypeScript adds **static types** but only at compile-time:

```typescript
let value: number = 42;
value = "hello";  // TypeScript error! But...
```

After compilation, your code becomes plain JavaScript with NO type information.

### The typeof Operator

JavaScript has `typeof` for basic type checking:

```javascript
typeof 42         // "number"
typeof "hello"    // "string"
typeof true       // "boolean"
typeof undefined  // "undefined"
typeof null       // "object" (historical bug!)
typeof {}         // "object"
typeof []         // "object" (arrays are objects)
```

But `typeof` can't distinguish:
- Objects vs Arrays
- Different object shapes
- Optional properties
- Value ranges

That's why we need Zod!

### Type Narrowing

TypeScript uses "type narrowing" to refine types:

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // TypeScript knows value is string here
    return value.toUpperCase();
  } else {
    // TypeScript knows value is number here
    return value * 2;
  }
}
```

Zod's `.parse()` and `.safeParse()` are type narrowing functions!

---

## Common Patterns

### Pattern 1: Optional Fields

```typescript
const UserSchema = z.object({
  name: z.string(),
  nickname: z.string().optional(),  // string | undefined
});
```

### Pattern 2: Nullable Fields

```typescript
const SignalSchema = z.object({
  value: z.number(),
  previousValue: z.number().nullable(),  // number | null
});
```

### Pattern 3: Default Values

```typescript
const ConfigSchema = z.object({
  timeout: z.number().default(5000),
  retries: z.number().default(3),
});

const config = ConfigSchema.parse({});
// { timeout: 5000, retries: 3 }
```

### Pattern 4: Transformations

```typescript
// FRED returns numbers as strings - transform them!
const FredValueSchema = z.object({
  date: z.string(),
  value: z.string().transform((val) => {
    if (val === '.') return null;  // FRED's missing value marker
    return parseFloat(val);
  }),
});

// Input:  { date: "2024-01-01", value: "3.7" }
// Output: { date: "2024-01-01", value: 3.7 }
```

### Pattern 5: Custom Validation

```typescript
const SignalValueSchema = z.number()
  .min(-1, 'Signal must be >= -1')
  .max(1, 'Signal must be <= 1')
  .refine(
    (val) => !isNaN(val),
    'Signal cannot be NaN'
  );
```

### Pattern 6: Discriminated Unions

```typescript
const ApiResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.object({ value: z.number() }),
  }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
  }),
]);
```

---

## Experiments to Try

### Experiment 1: See TypeScript Fail at Runtime

Create a file and run it to see TypeScript's limitation:

```typescript
// experiments/typescript-limits.ts

interface User {
  name: string;
  age: number;
}

// Simulate API response (could be anything!)
const apiResponse = '{"name": "Alice", "age": "twenty five"}';
const user: User = JSON.parse(apiResponse);

console.log('User:', user);
console.log('Age:', user.age);
console.log('Age + 1:', user.age + 1);  // "twenty five1" - oops!
console.log('Type of age:', typeof user.age);  // "string" - not number!
```

**What you'll see:** TypeScript doesn't complain, but the code misbehaves.

### Experiment 2: Zod Catches the Error

```typescript
// experiments/zod-validation.ts
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const apiResponse = '{"name": "Alice", "age": "twenty five"}';
const data = JSON.parse(apiResponse);

const result = UserSchema.safeParse(data);

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.log('Validation FAILED!');
  console.log('Issues:', result.error.issues);
  // Issues: [{ path: ['age'], message: 'Expected number, received string' }]
}
```

**What you'll see:** Zod catches the invalid age at runtime!

### Experiment 3: Validate Your API

```typescript
// Test the signals API with intentionally bad data
import { SignalResultSchema } from '@/app/lib/schemas/signals';

// Good data
const goodSignal = {
  name: 'Test Signal',
  value: 0.5,
  interpretation: 'bullish',
  confidence: 0.8,
  explanation: 'Test explanation',
  indicators: { test: 1.0 },
  updatedAt: new Date().toISOString(),
};

console.log('Good signal:', SignalResultSchema.safeParse(goodSignal));

// Bad data - value out of range
const badSignal = {
  ...goodSignal,
  value: 5.0,  // Invalid! Must be -1 to 1
};

console.log('Bad signal:', SignalResultSchema.safeParse(badSignal));
// Error: Signal value cannot exceed 1
```

### Experiment 4: Build a Form Validator

```typescript
import { z } from 'zod';

const SignupFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords must match', path: ['confirmPassword'] }
);

// Test it!
const formData = {
  email: 'test@example',  // Missing .com
  password: 'weak',       // Too short
  confirmPassword: 'different',
};

const result = SignupFormSchema.safeParse(formData);
console.log('Form errors:', result.error?.issues);
```

---

## Best Practices

### Do's ✅

1. **Define schemas first, infer types**
   ```typescript
   // ✅ Good: Schema is source of truth
   const UserSchema = z.object({ name: z.string() });
   type User = z.infer<typeof UserSchema>;
   ```

2. **Use safeParse for user-facing errors**
   ```typescript
   // ✅ Good: Handle errors gracefully
   const result = schema.safeParse(data);
   if (!result.success) {
     showErrors(result.error.issues);
   }
   ```

3. **Validate at system boundaries**
   - API route handlers (incoming requests)
   - API responses (outgoing data)
   - Form submissions
   - External service responses

4. **Use meaningful error messages**
   ```typescript
   z.number().min(-1, 'Signal value cannot be less than -1')
   ```

### Don'ts ❌

1. **Don't skip validation for "trusted" sources**
   ```typescript
   // ❌ Bad: "Our backend always returns the right shape"
   const data: User = await response.json();
   ```

2. **Don't define types separately from schemas**
   ```typescript
   // ❌ Bad: Types and validation can drift apart
   interface User { name: string }
   const UserSchema = z.object({ name: z.string(), age: z.number() });
   ```

3. **Don't validate everything everywhere**
   - Validate at boundaries, trust within modules
   - Internal function calls don't need re-validation

---

## Project Files Reference

| File | Purpose |
|------|---------|
| `app/lib/schemas/fred.ts` | FRED API response validation |
| `app/lib/schemas/signals.ts` | Trading signals validation |
| `app/lib/schemas/index.ts` | Central exports |
| `app/api/fred/route.ts` | Uses Zod to validate responses |
| `app/api/signals/route.ts` | Uses Zod to validate signals |

---

## Further Learning

### Zod Resources

- [Zod Documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [Total TypeScript: Zod Tutorial](https://www.totaltypescript.com/tutorials/zod)

### TypeScript Deep Dives

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Type Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

### Related Project Documentation

- [API_SECURITY.md](./API_SECURITY.md) - API key protection
- [SIGNALS_API.md](./SIGNALS_API.md) - Trading signals documentation
- [DATA_NORMALIZATION.md](./DATA_NORMALIZATION.md) - Data frequency alignment

---

*Document created: January 2026*
*Project: FRED Economic Indicators Dashboard*
*See also: `app/lib/schemas/` for implementation*
