# Disallow `else if`. Use early returns or guard clauses instead (`no-mercy/no-else-if`)

📝 Disallow `else if`. Use early returns or guard clauses instead.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/ScarletFlash/no-mercy#configs).

<!-- end auto-generated rule header -->

## Rule details

Reports any `if` whose `alternate` is itself an `IfStatement` (i.e., `else if (...)`).

### Incorrect

```ts
if (a) {
  doX();
} else if (b) {
  doY();
}
```

### Correct

```ts
if (a) {
  doX();
  return;
}
if (b) {
  doY();
  return;
}
```
